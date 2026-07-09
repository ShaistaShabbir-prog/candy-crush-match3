/**
 * Sweet Crush — Real-Time Multiplayer via PeerJS (WebRTC P2P)
 * Issue #25
 *
 * Flow:
 *   Host creates Peer -> gets ID -> 6-char room code shown
 *   Guest enters code -> peer.connect(hostId) -> DataChannel opens
 *   JSON messages sync scores/moves in real-time across devices
 *
 * Fallback: local 2-player turn-based if PeerJS unavailable
 */

const Multiplayer = (() => {

  const WIN_MOVES   = 15;
  const COLORS      = { 1: '#7c3aed', 2: '#ec4899' };
  const PING_MS     = 5000;

  let peer=null, conn=null, mode=null, active=false;
  let myPlayer=1, pingTimer=null, roomCode=null;
  let currentPlayer = 1; // for local mode

  const state = { scores:{1:0,2:0}, movesLeft:{1:WIN_MOVES,2:WIN_MOVES} };
  const playerNames = { 1:'Player 1', 2:'Player 2' };

  // ── Load PeerJS from CDN lazily ──────────────────────────────
  function loadPeerJS() {
    return new Promise(resolve => {
      if (window.Peer) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload  = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function makeCode(peerId) { return peerId.slice(-6).toUpperCase(); }

  function getRoomLink(code) {
    return window.location.href.split('?')[0] + '?room=' + code;
  }

  // ── HOST ─────────────────────────────────────────────────────
  async function createRoom(hostName) {
    showStatus('Connecting to PeerJS…', '#a78bfa');
    const ok = await loadPeerJS();
    if (!ok) { alert('Could not load PeerJS — check internet connection.'); return; }

    peer = new Peer({ debug: 0 });
    peer.on('open', id => {
      roomCode = makeCode(id);
      // Store host peer ID so guests can look it up by room code
      localStorage.setItem('scr_peer_' + roomCode, id);
      playerNames[1] = hostName || 'Player 1';
      myPlayer = 1; mode = 'host';
      _initState();
      showShareModal(roomCode);
      showStatus('Room ready! Waiting for friend…', '#22c55e');
    });
    peer.on('connection', c => { conn = c; _setupConn(); });
    peer.on('error', e => showStatus('PeerJS error: ' + e.type, '#ef4444'));
  }

  // ── GUEST ────────────────────────────────────────────────────
  async function joinRoom(code, guestName) {
    showStatus('Joining room ' + code + '…', '#a78bfa');
    const ok = await loadPeerJS();
    if (!ok) { alert('Could not load PeerJS — check internet connection.'); return; }

    code = code.toUpperCase().trim();
    const hostId = localStorage.getItem('scr_peer_' + code);
    if (!hostId) {
      showStatus('Room not found — ask host to resend the link', '#ef4444');
      return;
    }

    peer = new Peer({ debug: 0 });
    peer.on('open', () => {
      conn = peer.connect(hostId, { reliable: true });
      playerNames[2] = guestName || 'Player 2';
      myPlayer = 2; mode = 'guest'; roomCode = code;
      _setupConn();
    });
    peer.on('error', e => showStatus('Error: ' + e.type, '#ef4444'));

    setTimeout(() => { if (!active) showStatus('Connection timeout — check room code', '#ef4444'); }, 10000);
  }

  // ── CONNECTION ───────────────────────────────────────────────
  function _setupConn() {
    conn.on('open', () => {
      active = true;
      _initState();
      _send({ type: myPlayer === 1 ? 'host_hello' : 'guest_hello', name: playerNames[myPlayer] });
      _startPing();
      renderHUD();
      const shareModal = document.getElementById('mp-share');
      if (shareModal) shareModal.style.display = 'none';
      showStatus('Connected! Game on 🎮', '#22c55e');
    });

    conn.on('data', msg => {
      if (msg.type === 'host_hello') {
        playerNames[1] = msg.name; updateHUD();
        showStatus('Connected to ' + msg.name, COLORS[1]);
      } else if (msg.type === 'guest_hello') {
        playerNames[2] = msg.name; updateHUD();
        showStatus(msg.name + ' joined! 🎮', COLORS[2]);
        // Update share modal status
        const statusEl = document.getElementById('mp-join-status');
        if (statusEl) statusEl.textContent = ' ' + msg.name + ' joined!';
      } else if (msg.type === 'move') {
        state.scores[msg.player]    = msg.totalScore;
        state.movesLeft[msg.player] = msg.movesLeft;
        updateHUD();
        if (state.movesLeft[1] <= 0 && state.movesLeft[2] <= 0) endGame();
      } else if (msg.type === 'rematch') {
        _initState(); active = true; updateHUD();
        showStatus('Rematch! 🔄', '#a78bfa');
      } else if (msg.type === 'ping') {
        _send({ type: 'pong' });
      }
    });

    conn.on('close', () => {
      if (active) { showStatus('Opponent disconnected 😢', '#ef4444'); active = false; _stopPing(); }
    });
    conn.on('error', e => showStatus('Connection error: ' + e, '#ef4444'));
  }

  function _send(msg) { if (conn && conn.open) try { conn.send(msg); } catch(e) {} }

  // ── GAME LOGIC ───────────────────────────────────────────────
  function _initState() {
    state.scores = {1:0, 2:0};
    state.movesLeft = {1:WIN_MOVES, 2:WIN_MOVES};
    currentPlayer = 1;
  }

  // Called by game engine on each successful match
  function onMove(points) {
    if (!active) return;
    if (mode === 'local') { onMoveLocal(points); return; }
    state.scores[myPlayer]    += points;
    state.movesLeft[myPlayer]  = Math.max(0, state.movesLeft[myPlayer] - 1);
    _send({ type:'move', player:myPlayer, totalScore:state.scores[myPlayer], movesLeft:state.movesLeft[myPlayer] });
    updateHUD();
    if (state.movesLeft[myPlayer] <= 0) {
      const other = myPlayer === 1 ? 2 : 1;
      if (state.movesLeft[other] <= 0) endGame();
    }
  }

  function onMoveLocal(points) {
    state.scores[currentPlayer]    += points;
    state.movesLeft[currentPlayer]  = Math.max(0, state.movesLeft[currentPlayer] - 1);
    updateHUD();
    if (state.movesLeft[currentPlayer] <= 0) {
      const other = currentPlayer === 1 ? 2 : 1;
      if (state.movesLeft[other] > 0) {
        currentPlayer = other;
        showStatus(playerNames[currentPlayer] + "'s turn!", COLORS[currentPlayer]);
      } else { endGame(); }
    }
  }

  function endGame() {
    active = false; _stopPing();
    _send({ type:'game_over', scores:state.scores });
    const w = state.scores[1] > state.scores[2] ? 1 : state.scores[2] > state.scores[1] ? 2 : 0;
    const msg = w === 0
      ? 'It\'s a Tie! ' + state.scores[1].toLocaleString() + ' — ' + state.scores[2].toLocaleString()
      : playerNames[w] + ' Wins! ' + state.scores[w].toLocaleString();
    const hud = document.getElementById('mp-hud');
    if (hud) hud.innerHTML = '<div style="width:100%;text-align:center">' +
      '<span style="color:#fbbf24;font-weight:700">🏆 ' + msg + '</span>' +
      '<button onclick="Multiplayer.rematch()" style="margin-left:10px;background:#7c3aed;color:#fff;border:none;padding:4px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem">🔄 Rematch</button>' +
      '<button onclick="Multiplayer.stop()" style="margin-left:6px;background:rgba(255,255,255,0.1);color:#fff;border:none;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:0.8rem">Exit</button>' +
      '</div>';
    if (typeof saveScore === 'function') saveScore(Math.max(state.scores[1], state.scores[2]), 0);
    if (typeof renderLeaderboard === 'function') renderLeaderboard();
  }

  function rematch() {
    _initState(); active = true;
    _send({ type:'rematch' }); updateHUD();
    showStatus('Rematch! 🔄', '#a78bfa');
  }

  // ── KEEPALIVE ─────────────────────────────────────────────────
  function _startPing() { pingTimer = setInterval(() => _send({type:'ping'}), PING_MS); }
  function _stopPing()  { clearInterval(pingTimer); pingTimer = null; }

  // ── LOCAL 2-PLAYER ────────────────────────────────────────────
  function startLocal(n1, n2) {
    mode = 'local'; active = true; myPlayer = 1;
    playerNames[1] = n1 || 'Player 1';
    playerNames[2] = n2 || 'Player 2';
    _initState(); renderHUD();
    showStatus(playerNames[1] + ' goes first! 🎮', COLORS[1]);
  }

  // ── STOP ──────────────────────────────────────────────────────
  function stop() {
    active = false; mode = null; _stopPing();
    try { if (conn) conn.close(); } catch(e) {}
    try { if (peer) peer.destroy(); } catch(e) {}
    conn = null; peer = null;
    const hud = document.getElementById('mp-hud');
    if (hud) { hud.remove(); document.body.style.paddingTop = '0'; }
    if (window.history) window.history.replaceState({}, '', window.location.pathname);
  }

  // ── UI ────────────────────────────────────────────────────────
  function showStatus(msg, color) {
    let t = document.getElementById('mp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mp-toast';
      t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);' +
        'padding:10px 22px;border-radius:25px;font-weight:700;font-size:0.88rem;' +
        'z-index:9999;pointer-events:none;color:#fff;transition:opacity 0.4s;max-width:90vw;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.background = color; t.style.opacity = '1';
    clearTimeout(t._t);
    t._t = setTimeout(() => t.style.opacity = '0', 3000);
  }

  function renderHUD() {
    let hud = document.getElementById('mp-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'mp-hud';
      hud.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9990;' +
        'display:flex;align-items:center;padding:8px 16px;gap:8px;min-height:54px;' +
        'background:rgba(8,8,18,0.97);border-bottom:2px solid #30363d';
      document.body.appendChild(hud);
      document.body.style.paddingTop = '58px';
    }
    updateHUD();
  }

  function updateHUD() {
    const hud = document.getElementById('mp-hud');
    if (!hud) return;
    const rc = roomCode ? (' ' + roomCode) : '';
    const modeIcon = mode==='host' ? '🟢' : mode==='guest' ? '🔵' : '🖥️';
    hud.innerHTML =
      '<div style="flex:1;text-align:left;opacity:' + (state.movesLeft[1]>0?1:0.4) + ';transition:opacity 0.3s">' +
        '<div style="color:' + COLORS[1] + ';font-weight:700;font-size:0.8rem">' + (myPlayer===1?'👤 ':'') + playerNames[1] + '</div>' +
        '<div style="color:#e6edf3;font-size:1.1rem;font-weight:800">' + state.scores[1].toLocaleString() + '</div>' +
        '<div style="color:#8b949e;font-size:0.7rem">' + state.movesLeft[1] + ' moves</div>' +
      '</div>' +
      '<div style="text-align:center;min-width:56px">' +
        '<div style="color:#8b949e;font-size:0.68rem">' + modeIcon + rc + '</div>' +
        '<div style="color:#6b7280;font-size:0.72rem">VS</div>' +
      '</div>' +
      '<div style="flex:1;text-align:right;opacity:' + (state.movesLeft[2]>0?1:0.4) + ';transition:opacity 0.3s">' +
        '<div style="color:' + COLORS[2] + ';font-weight:700;font-size:0.8rem">' + playerNames[2] + (myPlayer===2?' 👤':'') + '</div>' +
        '<div style="color:#e6edf3;font-size:1.1rem;font-weight:800">' + state.scores[2].toLocaleString() + '</div>' +
        '<div style="color:#8b949e;font-size:0.7rem">' + state.movesLeft[2] + ' moves</div>' +
      '</div>' +
      '<button onclick="Multiplayer.stop()" style="background:rgba(255,255,255,0.08);border:1px solid #30363d;color:#8b949e;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.72rem;margin-left:8px">✕</button>';
  }

  // ── SHARE MODAL ───────────────────────────────────────────────
  function showShareModal(code) {
    const link = getRoomLink(code);
    let m = document.getElementById('mp-share');
    if (!m) {
      m = document.createElement('div');
      m.id = 'mp-share';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10002;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(m);
    }
    const encodedLink = link.replace(/'/g, "\\'");
    m.innerHTML =
      '<div style="background:#13151f;border-radius:24px;padding:28px;max-width:380px;width:100%;text-align:center;border:1px solid #30363d">' +
        '<div style="font-size:2rem;margin-bottom:6px">🔗</div>' +
        '<h2 style="color:#a78bfa;margin:0 0 4px;font-size:1.3rem">Invite Friend</h2>' +
        '<p style="color:#6b7280;font-size:0.82rem;margin:0 0 16px">Share code or link — they open it and join instantly</p>' +
        '<div style="background:#0a0c14;border:2px solid #7c3aed;border-radius:14px;padding:16px;margin-bottom:14px;cursor:pointer" onclick="navigator.clipboard.writeText(\'' + code + '\')">' +
          '<div style="color:#6b7280;font-size:0.7rem;margin-bottom:4px">ROOM CODE</div>' +
          '<div style="color:#a78bfa;font-size:2.8rem;font-weight:900;letter-spacing:0.25em;font-family:monospace">' + code + '</div>' +
          '<div style="color:#6b7280;font-size:0.72rem;margin-top:4px">Tap to copy</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
          '<button onclick="navigator.clipboard.writeText(\'' + encodedLink + '\')" style="padding:11px;border-radius:12px;background:#1e1f2e;color:#e6edf3;border:1px solid #30363d;cursor:pointer;font-weight:600;font-size:0.85rem">📋 Copy Link</button>' +
          '<button onclick="navigator.share ? navigator.share({title:\'Sweet Crush Battle\',url:\'' + encodedLink + '\'}) : navigator.clipboard.writeText(\'' + encodedLink + '\')" style="padding:11px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;cursor:pointer;font-weight:700;font-size:0.85rem">📤 Share</button>' +
        '</div>' +
        '<div style="color:#6b7280;font-size:0.78rem;margin-bottom:14px">⏳ Waiting… <span id="mp-join-status" style="color:#22c55e"></span></div>' +
        '<button onclick="document.getElementById(\'mp-share\').style.display=\'none\'" style="width:100%;background:rgba(255,255,255,0.06);color:#8b949e;border:1px solid #30363d;padding:10px;border-radius:10px;cursor:pointer">Play while waiting</button>' +
      '</div>';
  }

  // ── SETUP MODAL ───────────────────────────────────────────────
  function showSetupModal() {
    let m = document.getElementById('mp-setup');
    if (!m) {
      m = document.createElement('div');
      m.id = 'mp-setup';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(m);
    }
    m.style.display = 'flex';

    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      m.innerHTML =
        '<div style="background:#13151f;border-radius:24px;padding:28px;max-width:340px;width:100%;text-align:center;border:2px solid #ec4899">' +
          '<div style="font-size:2rem;margin-bottom:6px">🎮</div>' +
          '<h2 style="color:#ec4899;margin:0 0 8px">Join Game</h2>' +
          '<div style="color:#a78bfa;font-size:2.4rem;font-weight:900;letter-spacing:0.2em;font-family:monospace;margin:10px 0;background:#0a0c14;border-radius:10px;padding:10px">' + roomParam + '</div>' +
          '<input id="mp-guest-name" placeholder="Your name" maxlength="15" style="width:100%;padding:11px 14px;border-radius:10px;border:1px solid #ec4899;background:#0a0c14;color:#e6edf3;font-size:0.95rem;margin:0 0 14px;box-sizing:border-box;text-align:center">' +
          '<button onclick="const n=document.getElementById(\'mp-guest-name\').value.trim()||\'Player 2\';document.getElementById(\'mp-setup\').style.display=\'none\';Multiplayer.joinRoom(\'' + roomParam + '\',n);" style="width:100%;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;padding:13px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem;margin-bottom:10px">🚀 Join Game!</button>' +
          '<p style="color:#6b7280;font-size:0.75rem">You\'ll play as Player 2</p>' +
        '</div>';
      return;
    }

    m.innerHTML =
      '<div style="background:#13151f;border-radius:24px;padding:26px;max-width:380px;width:100%;border:1px solid #30363d">' +
        '<h2 style="color:#a78bfa;text-align:center;margin:0 0 6px;font-size:1.3rem">👥 Multiplayer</h2>' +
        '<p style="color:#6b7280;font-size:0.8rem;text-align:center;margin:0 0 18px">Same device or different phones</p>' +
        '<label style="color:#8b949e;font-size:0.75rem;display:block;margin-bottom:4px">Your name</label>' +
        '<input id="mp-myname" value="' + playerNames[1] + '" maxlength="15" style="width:100%;padding:9px 12px;border-radius:10px;border:1px solid #30363d;background:#0a0c14;color:#e6edf3;font-size:0.92rem;margin-bottom:16px;box-sizing:border-box">' +
        '<div style="background:#0f1117;border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid #1e293b">' +
          '<div style="color:#22c55e;font-size:0.75rem;font-weight:700;margin-bottom:8px">🌐 DIFFERENT DEVICES</div>' +
          '<button onclick="const n=document.getElementById(\'mp-myname\').value.trim()||\'Player 1\';document.getElementById(\'mp-setup\').style.display=\'none\';Multiplayer.createRoom(n);" style="width:100%;padding:11px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;font-weight:700;cursor:pointer;font-size:0.9rem;margin-bottom:8px">🔗 Create Room → Get Code</button>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="mp-code" placeholder="Enter code (ABCXYZ)" maxlength="6" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,\'\')" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid #30363d;background:#0a0c14;color:#e6edf3;font-size:0.85rem;letter-spacing:0.12em;font-family:monospace">' +
            '<button onclick="const c=document.getElementById(\'mp-code\').value.trim();const n=document.getElementById(\'mp-myname\').value.trim()||\'Player 2\';if(c.length<4){alert(\'Enter a valid room code\');return;}document.getElementById(\'mp-setup\').style.display=\'none\';Multiplayer.joinRoom(c,n);" style="padding:9px 14px;border-radius:10px;background:#ec4899;color:#fff;border:none;font-weight:700;cursor:pointer">Join</button>' +
          '</div>' +
        '</div>' +
        '<div style="background:#0f1117;border-radius:14px;padding:14px;border:1px solid #1e293b">' +
          '<div style="color:#8b949e;font-size:0.75rem;font-weight:700;margin-bottom:8px">🖥️ SAME DEVICE</div>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="mp-p2" placeholder="Friend\'s name" maxlength="15" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid #30363d;background:#0a0c14;color:#e6edf3;font-size:0.85rem">' +
            '<button onclick="const n1=document.getElementById(\'mp-myname\').value.trim()||\'Player 1\';const n2=document.getElementById(\'mp-p2\').value.trim()||\'Player 2\';document.getElementById(\'mp-setup\').style.display=\'none\';Multiplayer.startLocal(n1,n2);" style="padding:9px 14px;border-radius:10px;background:#7c3aed;color:#fff;border:none;font-weight:700;cursor:pointer">▶ Play</button>' +
          '</div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'mp-setup\').style.display=\'none\'" style="width:100%;background:transparent;border:none;color:#4b5563;cursor:pointer;padding:12px;margin-top:6px;font-size:0.8rem">Cancel</button>' +
      '</div>';
  }

  // Auto-show join modal if URL has ?room=
  window.addEventListener('DOMContentLoaded', () => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) setTimeout(showSetupModal, 600);
  });

  return {
    createRoom, joinRoom, startLocal, onMove, onMoveLocal,
    rematch, stop, showSetupModal, showShareModal,
    isActive: () => active,
    playerNames,
    get scores() { return { ...state.scores }; },
  };
})();

window.Multiplayer = Multiplayer;
