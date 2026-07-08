// Sweet Crush — Difficulty Levels
// Easy / Normal / Hard / Expert — affects board size, candy types, moves, targets

const Difficulty = (function() {
  const LEVELS = {
    easy: {
      label: '😊 Easy',
      color: '#22c55e',
      gridSize: 6,
      candyTypes: 4,
      movesPerLevel: 30,
      targetMultiplier: 0.7,
      description: '6×6 board · 4 candy types · 30 moves',
      timeLimit: null,
    },
    normal: {
      label: '😐 Normal',
      color: '#3b82f6',
      gridSize: 8,
      candyTypes: 5,
      movesPerLevel: 20,
      targetMultiplier: 1.0,
      description: '8×8 board · 5 candy types · 20 moves',
      timeLimit: null,
    },
    hard: {
      label: '😤 Hard',
      color: '#f59e0b',
      gridSize: 8,
      candyTypes: 6,
      movesPerLevel: 15,
      targetMultiplier: 1.4,
      description: '8×8 board · 6 candy types · 15 moves · harder targets',
      timeLimit: null,
    },
    expert: {
      label: '💀 Expert',
      color: '#ef4444',
      gridSize: 9,
      candyTypes: 7,
      movesPerLevel: 12,
      targetMultiplier: 2.0,
      description: '9×9 board · 7 candy types · 12 moves · 60s time limit',
      timeLimit: 60,
    },
  };

  let current = localStorage.getItem('crushDifficulty') || 'normal';

  function get() { return LEVELS[current] || LEVELS.normal; }
  function getKey() { return current; }

  function set(key) {
    if (!LEVELS[key]) return;
    current = key;
    localStorage.setItem('crushDifficulty', key);
    applyToGame();
  }

  function applyToGame() {
    const d = get();
    // Expose to game engine via window globals
    window.DIFFICULTY_CONFIG = d;
    // Show toast
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:120px;left:50%;transform:translateX(-50%);
      background:${d.color};color:#fff;padding:10px 24px;border-radius:20px;
      font-weight:700;z-index:9999;pointer-events:none;transition:opacity 0.4s`;
    t.textContent = `${d.label} mode activated!`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),400); }, 1800);
  }

  function showModal() {
    let modal = document.getElementById('difficulty-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'difficulty-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;' +
        'display:flex;align-items:center;justify-content:center';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#1a1f2e;border-radius:20px;padding:28px;max-width:360px;width:92%;border:1px solid #30363d">
        <h2 style="color:#a78bfa;text-align:center;margin:0 0 20px">⚙️ Difficulty</h2>
        ${Object.entries(LEVELS).map(([key, d]) => `
          <div onclick="Difficulty.set('${key}');document.getElementById('difficulty-modal').style.display='none';"
            style="border:2px solid ${current===key?d.color:'#30363d'};border-radius:12px;padding:12px 16px;
              margin-bottom:10px;cursor:pointer;transition:border-color 0.2s;background:${current===key?d.color+'22':'transparent'}">
            <div style="font-weight:700;color:${d.color};font-size:1rem">${d.label}</div>
            <div style="color:#8b949e;font-size:0.8rem;margin-top:2px">${d.description}</div>
            ${d.timeLimit?`<div style="color:#ef4444;font-size:0.75rem;margin-top:2px">⏱ ${d.timeLimit}s time limit</div>`:''}
          </div>`).join('')}
        <button onclick="document.getElementById('difficulty-modal').style.display='none'"
          style="width:100%;background:rgba(255,255,255,0.1);color:#fff;border:none;
            padding:10px;border-radius:10px;cursor:pointer;margin-top:4px">Close</button>
      </div>`;
  }

  // Init
  window.DIFFICULTY_CONFIG = LEVELS[current];

  return { get, getKey, set, showModal, LEVELS };
})();

window.Difficulty = Difficulty;
