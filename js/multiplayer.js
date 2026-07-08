// Sweet Crush — Local 2-Player Race Mode
// Both players play the same board simultaneously on the same device.
// Player 1 uses LEFT side, Player 2 uses RIGHT side (split-screen concept).
// Alternatively: 2-player TURN-BASED mode where players alternate turns.
//
// Implementation: turn-based (most practical for same-device, same-screen)

const Multiplayer = (function() {
  let mode = null; // null | 'vs' | 'coop'
  let currentPlayer = 1;
  let scores = { 1: 0, 2: 0 };
  let turnsLeft = { 1: 15, 2: 15 };
  let playerNames = { 1: 'Player 1', 2: 'Player 2' };
  let active = false;

  const COLORS = { 1: '#7c3aed', 2: '#ec4899' };

  function start(selectedMode) {
    mode = selectedMode;
    currentPlayer = 1;
    scores = { 1: 0, 2: 0 };
    turnsLeft = { 1: 15, 2: 15 };
    active = true;
    renderHUD();
    announcePlayer();
  }

  function stop() {
    active = false;
    mode = null;
    const hud = document.getElementById('mp-hud');
    if (hud) hud.remove();
  }

  function isActive() { return active; }

  function onMove(pointsScored) {
    if (!active) return;
    scores[currentPlayer] += pointsScored;
    turnsLeft[currentPlayer]--;
    updateHUD();

    if (turnsLeft[currentPlayer] <= 0) {
      if (currentPlayer === 1 && turnsLeft[2] > 0) {
        currentPlayer = 2;
        announcePlayer();
      } else {
        endGame();
        return;
      }
    }
    updateHUD();
  }

  function announcePlayer() {
    const name = playerNames[currentPlayer];
    const color = COLORS[currentPlayer];
    showToast(`${name}'s Turn! 🎮`, color);
  }

  function showToast(msg, color) {
    let t = document.getElementById('mp-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mp-toast';
      t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
        'padding:12px 24px;border-radius:30px;font-weight:700;font-size:1rem;' +
        'z-index:9999;transition:opacity 0.4s;pointer-events:none;color:#fff';
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
        'display:flex;align-items:center;justify-content:space-between;' +
        'padding:8px 16px;background:rgba(10,10,20,0.95);border-bottom:2px solid #30363d';
      document.body.appendChild(hud);
      document.body.style.paddingTop = '52px';
    }
    updateHUD();
  }

  function updateHUD() {
    const hud = document.getElementById('mp-hud');
    if (!hud) return;
    hud.innerHTML =
      ['1','2'].map(p => {
        const isActive = currentPlayer == p;
        return `<div style="flex:1;text-align:${p=='1'?'left':'right'};` +
          `opacity:${isActive?1:0.5};transition:opacity 0.3s">` +
          `<div style="color:${COLORS[p]};font-weight:700;font-size:0.85rem">${playerNames[p]}${isActive?' 👈':''}</div>` +
          `<div style="color:#e6edf3;font-size:1.1rem;font-weight:700">${scores[p].toLocaleString()}</div>` +
          `<div style="color:#8b949e;font-size:0.75rem">${turnsLeft[p]} moves left</div>` +
          `</div>`;
      }).join(`<div style="color:#a78bfa;font-weight:700;font-size:0.9rem">VS</div>`) +
      `<button onclick="Multiplayer.stop()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);` +
      `background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.75rem">✕ Exit</button>`;
  }

  function endGame() {
    active = false;
    const winner = scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 0;
    const msg = winner === 0
      ? `🤝 It's a Tie! (${scores[1].toLocaleString()} each)`
      : `🏆 ${playerNames[winner]} Wins!\n${scores[1].toLocaleString()} vs ${scores[2].toLocaleString()}`;

    setTimeout(() => {
      const hud = document.getElementById('mp-hud');
      if (hud) {
        hud.innerHTML = `<div style="width:100%;text-align:center;color:#fbbf24;font-weight:700;font-size:1rem">${msg.replace('\n',' — ')}</div>`;
        document.body.style.paddingTop = '52px';
      }
      saveScore(Math.max(scores[1], scores[2]), 0);
      if (typeof renderLeaderboard === 'function') renderLeaderboard();
    }, 300);
  }

  function showSetupModal() {
    let modal = document.getElementById('mp-setup');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mp-setup';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;' +
        'display:flex;align-items:center;justify-content:center';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#1a1f2e;border-radius:20px;padding:28px;max-width:340px;width:90%;text-align:center;border:1px solid #30363d">
        <h2 style="color:#a78bfa;margin:0 0 4px">👥 2-Player Mode</h2>
        <p style="color:#8b949e;font-size:0.85rem;margin:0 0 20px">Take turns on the same device — 15 moves each</p>
        <div style="margin-bottom:16px">
          <input id="mp-name1" placeholder="Player 1 name" maxlength="15"
            style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#e6edf3;font-size:0.9rem;margin-bottom:8px">
          <input id="mp-name2" placeholder="Player 2 name" maxlength="15"
            style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#e6edf3;font-size:0.9rem">
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button onclick="
            const n1=document.getElementById('mp-name1').value.trim()||'Player 1';
            const n2=document.getElementById('mp-name2').value.trim()||'Player 2';
            Multiplayer.playerNames={1:n1,2:n2};
            document.getElementById('mp-setup').style.display='none';
            Multiplayer.start('vs');"
            style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;
              padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.95rem">
            🎮 Start!
          </button>
          <button onclick="document.getElementById('mp-setup').style.display='none'"
            style="background:rgba(255,255,255,0.1);color:#fff;border:none;
              padding:10px 20px;border-radius:10px;cursor:pointer">Cancel</button>
        </div>
      </div>`;
  }

  return { start, stop, isActive, onMove, showSetupModal,
           playerNames, get scores() { return scores; }, get current() { return currentPlayer; } };
})();

window.Multiplayer = Multiplayer;
