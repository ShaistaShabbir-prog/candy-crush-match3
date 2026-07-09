// Sweet Crush — Multiplayer System
// Supports:
//   1. Local 2-player (same device, turn-based)
//   2. Link-based online (share URL → other player opens on their device)
//      Uses BroadcastChannel + localStorage for same-browser tabs,
//      and URL-encoded game state for cross-device async play.

const Multiplayer = (function() {

  // ── Shared state ──────────────────────────────────────────
  let mode         = null;   // 'local' | 'online-host' | 'online-guest'
  let currentPlayer = 1;
  let scores       = { 1: 0, 2: 0 };
  let turnsLeft    = { 1: 15, 2: 15 };
  let active       = false;
  let roomCode     = null;
  let channel      = null;   // BroadcastChannel for same-browser tabs

  const COLORS  = { 1: '#7c3aed', 2: '#ec4899' };
  const WIN_MOVES = 15;

  // Expose playerNames so kaw-multiplayer can share
  const playerNames = { 1: 'Player 1', 2: 'Player 2' };

  // ── Room code helpers ─────────────────────────────────────
  function generateRoomCode() {
    // 6-char alphanumeric — easy to share
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function getRoomLink(code) {
    const base = window.location.href.split('?')[0];
    return `${base}?room=${code}&player=2`;
  }

  function readUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return { room: p.get('room'), player: p.get('player') };
  }

  // ── BroadcastChannel (same browser, cross-tab) ────────────
  function openChannel(code) {
    if (!window.BroadcastChannel) return null;
    const ch = new BroadcastChannel(`sweet-crush-${code}`);
    ch.onmessage = (e) => handleRemoteMessage(e.data);
    return ch;
  }

  function sendToChannel(msg) {
    if (channel) channel.postMessage(msg);
    // Also save to localStorage as fallback for cross-device async
    if (roomCode) {
      try {
        const key = `scr_${roomCode}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        history.push({ ...msg, ts: Date.now() });
        if (history.length > 50) history.shift();
        localStorage.setItem(key, JSON.stringify(history));
      } catch(e) {}
    }
  }

  function handleRemoteMessage(msg) {
    if (msg.type === 'move') {
      scores[msg.player]   = msg.score;
      turnsLeft[msg.player] = msg.turnsLeft;
      currentPlayer = msg.nextPlayer;
      updateHUD();
      if (msg.gameOver) endGame();
    } else if (msg.type === 'join') {
      playerNames[2] = msg.name;
      updateHUD();
      showToast(`${msg.name} joined! 🎮`, COLORS[2]);
    }
  }

  // ── Start modes ───────────────────────────────────────────
  function startLocal() {
    mode = 'local';
    _init();
  }

  function startOnlineHost() {
    mode = 'online-host';
    roomCode = generateRoomCode();
    channel  = openChannel(roomCode);
    _init();
    showShareModal();
  }

  function joinAsGuest(code, name) {
    mode         = 'online-guest';
    roomCode     = code.toUpperCase().trim();
    channel      = openChannel(roomCode);
    playerNames[2] = name || 'Guest';
    active       = true;
    currentPlayer = 2;
    scores        = { 1: 0, 2: 0 };
    turnsLeft     = { 1: WIN_MOVES, 2: WIN_MOVES };
    sendToChannel({ type: 'join', name: playerNames[2] });
    renderHUD();
    showToast(`Joined room ${roomCode}! You are Player 2 🩷`, COLORS[2]);
  }

  function _init() {
    currentPlayer = 1;
    scores        = { 1: 0, 2: 0 };
    turnsLeft     = { 1: WIN_MOVES, 2: WIN_MOVES };
    active        = true;
    renderHUD();
    announcePlayer();
  }

  function stop() {
    active = false;
    mode   = null;
    if (channel) { channel.close(); channel = null; }
    const hud = document.getElementById('mp-hud');
    if (hud) { hud.remove(); document.body.style.paddingTop = '0'; }
    // Clean URL
    if (window.history) window.history.replaceState({}, '', window.location.pathname);
  }

  function isActive()        { return active; }
  function isMyTurn()        {
    if (mode === 'online-guest')  return currentPlayer === 2;
    if (mode === 'online-host')   return currentPlayer === 1;
    return true; // local — always player's turn
  }

  // ── Move handler ──────────────────────────────────────────
  function onMove(pointsScored) {
    if (!active) return;
    scores[currentPlayer]    += pointsScored;
    turnsLeft[currentPlayer]--;
    updateHUD();

    const nextPlayer = currentPlayer === 1 ? 2 : 1;

    if (mode !== 'local') {
      sendToChannel({
        type: 'move',
        player: currentPlayer,
        score: scores[currentPlayer],
        turnsLeft: turnsLeft[currentPlayer],
        nextPlayer,
        gameOver: turnsLeft[1] <= 0 && turnsLeft[2] <= 0,
      });
    }

    if (turnsLeft[currentPlayer] <= 0) {
      if (nextPlayer === 2 && turnsLeft[2] > 0) {
        currentPlayer = 2;
        announcePlayer();
      } else if (nextPlayer === 1 && turnsLeft[1] > 0) {
        currentPlayer = 1;
        announcePlayer();
      } else {
        endGame();
        return;
      }
    } else {
      if (mode === 'local') {
        currentPlayer = nextPlayer;
        announcePlayer();
      }
    }
    updateHUD();
  }

  // ── UI helpers ────────────────────────────────────────────
  function announcePlayer() {
    showToast(`${playerNames[currentPlayer]}'s Turn! 🎮`, COLORS[currentPlayer]);
  }

  function showToast(msg, color) {
    let t = document.getElementById('mp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mp-toast';
      t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
        'padding:12px 24px;border-radius:30px;font-weight:700;font-size:1rem;' +
        'z-index:9999;pointer-events:none;color:#fff;transition:opacity 0.4s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = color;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.style.opacity = '0', 2200);
  }

  function renderHUD() {
    let hud = document.getElementById('mp-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'mp-hud';
      hud.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9990;' +
        'display:flex;align-items:center;padding:8px 16px;gap:8px;' +
        'background:rgba(10,10,20,0.96);border-bottom:2px solid #30363d;min-height:52px';
      document.body.appendChild(hud);
      document.body.style.paddingTop = '56px';
    }
    updateHUD();
  }

  function updateHUD() {
    const hud = document.getElementById('mp-hud');
    if (!hud) return;
    const modeLabel = mode === 'online-host' ? `🔗 Room: ${roomCode}` :
                      mode === 'online-guest' ? `🔗 Room: ${roomCode}` : '🖥️ Local';
    hud.innerHTML =
      `<div style="flex:1;text-align:left;opacity:${currentPlayer==1?1:0.45};transition:opacity 0.3s">
        <div style="color:${COLORS[1]};font-weight:700;font-size:0.82rem">${playerNames[1]}${currentPlayer==1?' 👈':''}</div>
        <div style="color:#e6edf3;font-size:1.05rem;font-weight:700">${scores[1].toLocaleString()}</div>
        <div style="color:#8b949e;font-size:0.72rem">${turnsLeft[1]} moves</div>
      </div>
      <div style="text-align:center">
        <div style="color:#a78bfa;font-weight:700;font-size:0.78rem">${modeLabel}</div>
        <div style="color:#6b7280;font-size:0.7rem">VS</div>
      </div>
      <div style="flex:1;text-align:right;opacity:${currentPlayer==2?1:0.45};transition:opacity 0.3s">
        <div style="color:${COLORS[2]};font-weight:700;font-size:0.82rem">${currentPlayer==2?'👉 ':''}${playerNames[2]}</div>
        <div style="color:#e6edf3;font-size:1.05rem;font-weight:700">${scores[2].toLocaleString()}</div>
        <div style="color:#8b949e;font-size:0.72rem">${turnsLeft[2]} moves</div>
      </div>
      <button onclick="Multiplayer.stop()"
        style="background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:6px;
          padding:4px 10px;cursor:pointer;font-size:0.72rem;margin-left:8px">✕</button>`;
  }

  function endGame() {
    active = false;
    const winner = scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 0;
    const hud = document.getElementById('mp-hud');
    if (!hud) return;
    const msg = winner === 0
      ? `🤝 Tie! ${scores[1].toLocaleString()} — ${scores[2].toLocaleString()}`
      : `🏆 ${playerNames[winner]} Wins! ${scores[winner].toLocaleString()}`;
    hud.innerHTML = `
      <div style="width:100%;text-align:center">
        <span style="color:#fbbf24;font-weight:700">${msg}</span>
        <button onclick="Multiplayer.stop()" style="margin-left:12px;background:rgba(255,255,255,0.1);
          border:none;color:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.8rem">Close</button>
      </div>`;
    if (typeof saveScore === 'function') saveScore(Math.max(scores[1], scores[2]), 0);
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
  }

  // ── Share modal ───────────────────────────────────────────
  function showShareModal() {
    const link = getRoomLink(roomCode);
    let modal = document.getElementById('mp-share');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mp-share';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);' +
        'z-index:10001;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:#1a1f2e;border-radius:20px;padding:28px;max-width:380px;
        width:92%;text-align:center;border:1px solid #30363d">
        <h2 style="color:#a78bfa;margin:0 0 4px">🔗 Invite Friend</h2>
        <p style="color:#8b949e;font-size:0.85rem;margin:0 0 20px">
          Share this link or room code — your friend opens it on their device
        </p>

        <!-- Room code (big, easy to read) -->
        <div style="background:#0d1117;border:2px solid #7c3aed;border-radius:12px;
          padding:14px;margin-bottom:16px">
          <div style="color:#8b949e;font-size:0.72rem;margin-bottom:4px">ROOM CODE</div>
          <div style="color:#a78bfa;font-size:2.2rem;font-weight:900;letter-spacing:0.2em">
            ${roomCode}
          </div>
        </div>

        <!-- Link copy -->
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;
          padding:8px 12px;font-size:0.72rem;color:#6b7280;word-break:break-all;
          margin-bottom:14px;text-align:left">${link}</div>

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button onclick="navigator.clipboard.writeText('${link}').then(()=>{this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy Link',2000)})"
            style="flex:1;background:#7c3aed;color:#fff;border:none;padding:10px;
              border-radius:10px;font-weight:700;cursor:pointer">📋 Copy Link</button>
          <button onclick="navigator.share ? navigator.share({title:'Sweet Crush Battle',text:'Join my Sweet Crush game!',url:'${link}'}) : alert('Copy the link above!')"
            style="flex:1;background:#ec4899;color:#fff;border:none;padding:10px;
              border-radius:10px;font-weight:700;cursor:pointer">📤 Share</button>
        </div>

        <div style="color:#8b949e;font-size:0.78rem;margin-bottom:14px">
          💡 You play first while your friend joins
        </div>

        <button onclick="document.getElementById('mp-share').style.display='none'"
          style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:10px 20px;
            border-radius:10px;cursor:pointer;width:100%">Start Playing</button>
      </div>`;
  }

  // ── Setup modal ───────────────────────────────────────────
  function showSetupModal() {
    let modal = document.getElementById('mp-setup');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mp-setup';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);' +
        'z-index:10000;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    // Check if joining via URL
    const params = readUrlParams();
    if (params.room) {
      // Auto-show join UI
      modal.innerHTML = _joinUI(params.room);
      return;
    }

    modal.innerHTML = `
      <div style="background:#1a1f2e;border-radius:20px;padding:28px;max-width:360px;
        width:92%;border:1px solid #30363d">
        <h2 style="color:#a78bfa;text-align:center;margin:0 0 20px">👥 Multiplayer</h2>

        <!-- Player names -->
        <input id="mp-name1" placeholder="Your name" maxlength="15" value="${playerNames[1]}"
          style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #30363d;
            background:#0d1117;color:#e6edf3;font-size:0.9rem;margin-bottom:8px;box-sizing:border-box">

        <hr style="border-color:#30363d;margin:14px 0">

        <!-- Option 1: Local -->
        <div style="margin-bottom:10px">
          <div style="color:#8b949e;font-size:0.78rem;margin-bottom:6px">🖥️ Same device</div>
          <div style="display:flex;gap:8px">
            <input id="mp-name2" placeholder="Friend's name" maxlength="15" value="${playerNames[2]}"
              style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #30363d;
                background:#0d1117;color:#e6edf3;font-size:0.9rem">
            <button onclick="
              playerNames[1]=document.getElementById('mp-name1').value.trim()||'Player 1';
              playerNames[2]=document.getElementById('mp-name2').value.trim()||'Player 2';
              document.getElementById('mp-setup').style.display='none';
              Multiplayer.startLocal();"
              style="background:#7c3aed;color:#fff;border:none;padding:8px 14px;
                border-radius:8px;font-weight:700;cursor:pointer;white-space:nowrap">
              ▶ Play
            </button>
          </div>
        </div>

        <hr style="border-color:#30363d;margin:14px 0">

        <!-- Option 2: Online via link -->
        <div style="margin-bottom:10px">
          <div style="color:#8b949e;font-size:0.78rem;margin-bottom:6px">🔗 Different devices — share a link</div>
          <button onclick="
            playerNames[1]=document.getElementById('mp-name1').value.trim()||'Player 1';
            document.getElementById('mp-setup').style.display='none';
            Multiplayer.startOnlineHost();"
            style="width:100%;background:linear-gradient(135deg,#7c3aed,#ec4899);
              color:#fff;border:none;padding:10px;border-radius:10px;
              font-weight:700;cursor:pointer;font-size:0.9rem">
            🔗 Create Room & Get Link
          </button>
        </div>

        <hr style="border-color:#30363d;margin:14px 0">

        <!-- Option 3: Join with code -->
        <div>
          <div style="color:#8b949e;font-size:0.78rem;margin-bottom:6px">📨 Got a room code?</div>
          <div style="display:flex;gap:8px">
            <input id="mp-code" placeholder="Room code (e.g. AB3XY7)" maxlength="6"
              style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #30363d;
                background:#0d1117;color:#e6edf3;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.1em"
              oninput="this.value=this.value.toUpperCase()">
            <button onclick="
              const code=document.getElementById('mp-code').value.trim();
              const name=document.getElementById('mp-name1').value.trim()||'Player 2';
              if(code.length<4){alert('Enter a valid room code');return;}
              document.getElementById('mp-setup').style.display='none';
              Multiplayer.joinAsGuest(code, name);"
              style="background:#ec4899;color:#fff;border:none;padding:8px 14px;
                border-radius:8px;font-weight:700;cursor:pointer">
              Join
            </button>
          </div>
        </div>

        <button onclick="document.getElementById('mp-setup').style.display='none'"
          style="width:100%;background:transparent;border:none;color:#6b7280;
            cursor:pointer;padding:10px;margin-top:10px;font-size:0.8rem">Cancel</button>
      </div>`;
  }

  function _joinUI(roomCode) {
    return `
      <div style="background:#1a1f2e;border-radius:20px;padding:28px;max-width:340px;
        width:92%;text-align:center;border:1px solid #ec4899">
        <div style="font-size:2rem;margin-bottom:8px">🎮</div>
        <h2 style="color:#ec4899;margin:0 0 4px">Join Game</h2>
        <div style="color:#a78bfa;font-size:1.4rem;font-weight:900;letter-spacing:0.15em;margin:10px 0">
          ${roomCode}
        </div>
        <input id="mp-guest-name" placeholder="Your name" maxlength="15"
          style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #ec4899;
            background:#0d1117;color:#e6edf3;font-size:0.95rem;margin:12px 0;box-sizing:border-box">
        <div style="display:flex;gap:8px;justify-content:center">
          <button onclick="
            const name=document.getElementById('mp-guest-name').value.trim()||'Guest';
            document.getElementById('mp-setup').style.display='none';
            Multiplayer.joinAsGuest('${roomCode}', name);"
            style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;
              padding:12px 28px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem">
            🚀 Join!
          </button>
        </div>
        <p style="color:#6b7280;font-size:0.78rem;margin-top:12px">
          You'll play as <strong style="color:#ec4899">Player 2</strong>
        </p>
      </div>`;
  }

  // ── Auto-detect URL join on page load ─────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    const params = readUrlParams();
    if (params.room && params.player === '2') {
      // Auto-show join modal
      setTimeout(() => showSetupModal(), 800);
    }
  });

  return {
    startLocal, startOnlineHost, joinAsGuest,
    stop, isActive, isMyTurn, onMove,
    showSetupModal, showShareModal,
    playerNames,
    get scores() { return { ...scores }; },
    get current() { return currentPlayer; },
  };
})();

window.Multiplayer = Multiplayer;
