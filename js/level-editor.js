// Issue #8: Level editor — create and share custom levels via URL
const LevelEditor = {
  grid: [],
  rows: 8,
  cols: 8,
  CANDY_TYPES: ['🍭', '🍬', '🍫', '🧁', '🍩', '🌈', '💎'],

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.grid = Array.from({length: this.rows}, () => Array(this.cols).fill(0));
    this.render();
  },

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <h2 style="margin:0 0 12px;color:#fbbf24">🎨 Level Editor</h2>
      <div style="display:grid;grid-template-columns:repeat(${this.cols},44px);gap:3px;margin-bottom:14px">
        ${this.grid.flat().map((c, i) => `
          <button onclick="LevelEditor.cycleCell(${Math.floor(i/this.cols)},${i%this.cols})"
            style="width:44px;height:44px;border-radius:8px;border:1.5px solid rgba(255,255,255,.15);
            background:rgba(255,255,255,.05);font-size:1.4rem;cursor:pointer;
            transition:transform .1s" title="Click to change">${c ? this.CANDY_TYPES[c-1] : '⬜'}
          </button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="LevelEditor.shareLevel()" style="padding:8px 16px;border-radius:8px;background:#7c3aed;color:#fff;border:none;cursor:pointer;font-weight:700">🔗 Share Level</button>
        <button onclick="LevelEditor.clearGrid()" style="padding:8px 16px;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;border:none;cursor:pointer">🗑️ Clear</button>
        <button onclick="LevelEditor.randomLevel()" style="padding:8px 16px;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;border:none;cursor:pointer">🎲 Random</button>
      </div>
      <div id="share-url" style="margin-top:10px;font-size:.75rem;color:#94a3b8;word-break:break-all"></div>`;
  },

  cycleCell(r, c) {
    this.grid[r][c] = (this.grid[r][c] + 1) % (this.CANDY_TYPES.length + 1);
    this.render();
  },

  clearGrid() {
    this.grid = Array.from({length: this.rows}, () => Array(this.cols).fill(0));
    this.render();
  },

  randomLevel() {
    this.grid = Array.from({length: this.rows}, () =>
      Array.from({length: this.cols}, () => Math.floor(Math.random() * this.CANDY_TYPES.length) + 1)
    );
    this.render();
  },

  shareLevel() {
    const encoded = btoa(JSON.stringify(this.grid));
    const url = `${location.origin}${location.pathname}?level=${encoded}`;
    history.pushState({}, '', `?level=${encoded}`);
    const el = document.getElementById('share-url');
    if (el) el.textContent = '✅ URL updated! Share: ' + url;
    try { navigator.clipboard.writeText(url); } catch {}
  },

  loadFromURL() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('level');
    if (!encoded) return;
    try {
      this.grid = JSON.parse(atob(encoded));
      this.render();
    } catch {}
  },
};

window.LevelEditor = LevelEditor;
