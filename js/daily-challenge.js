// Issue #9: Daily Challenge Mode
(function(){
  function getDateSeed() {
    const d = new Date();
    return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  }

  function seededRandom(seed) {
    let s = seed;
    return function() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  function generateDailyGrid(seed) {
    const rng = seededRandom(seed);
    const TYPES = 5;
    return Array.from({length:8}, () => Array.from({length:8}, () => Math.floor(rng()*TYPES)));
  }

  function getDailyNumber() {
    const epoch = new Date('2025-01-01').getTime();
    return Math.floor((Date.now() - epoch) / 86400000) + 1;
  }

  function getResult() {
    const key = `crush_daily_${getDateSeed()}`;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function saveResult(score, stars) {
    const key = `crush_daily_${getDateSeed()}`;
    localStorage.setItem(key, JSON.stringify({score, stars, date: new Date().toISOString()}));
  }

  function shareResult(score, stars) {
    const dayNum = getDailyNumber();
    const starEmoji = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
    const text = `Sweet Crush Daily #${dayNum}\n${starEmoji} ${score.toLocaleString()} pts\n`;
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
  }

  function showDailyUI() {
    const result = getResult();
    const dayNum = getDailyNumber();
    const div = document.createElement('div');
    div.id = 'daily-modal';
    div.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9997;display:flex;align-items:center;justify-content:center';
    const seed = getDateSeed();

    div.innerHTML = `<div style="background:#1a1a2e;border-radius:20px;padding:28px;max-width:340px;width:90%;text-align:center">
      <div style="font-size:.75rem;color:#a78bfa;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Daily Challenge</div>
      <h2 style="color:#fff;font-size:1.4rem;margin:0 0 6px">Day #${dayNum}</h2>
      <p style="color:#7c8fa8;font-size:.85rem;margin:0 0 20px">Same puzzle for everyone today</p>
      ${result ? `
        <div style="font-size:2rem;margin-bottom:8px">${'⭐'.repeat(result.stars)}${'☆'.repeat(3-result.stars)}</div>
        <div style="font-size:1.5rem;font-weight:800;color:#fbbf24;margin-bottom:16px">${result.score.toLocaleString()}</div>
        <button onclick="window.DailyChallenge.share(${result.score},${result.stars})"
          style="width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:.9rem">
          📤 Share result
        </button>` : `
        <button onclick="window.DailyChallenge.start();document.getElementById('daily-modal').style.display='none'"
          style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:.9rem">
          🎮 Play today's challenge
        </button>`}
      <button onclick="document.getElementById('daily-modal').style.display='none'"
        style="width:100%;margin-top:10px;padding:10px;background:rgba(255,255,255,.06);color:#aaa;border:1px solid rgba(255,255,255,.1);border-radius:12px;cursor:pointer;font-size:.85rem">
        Close
      </button>
    </div>`;
    document.body.appendChild(div);
    return div;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.textContent = '📅 Daily';
    btn.style.cssText = 'position:fixed;bottom:120px;left:16px;z-index:998;padding:8px 14px;background:rgba(236,72,153,.9);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:.8rem;font-weight:700';
    btn.onclick = () => { let m=document.getElementById('daily-modal'); if(!m)m=showDailyUI(); m.style.display='flex'; };
    document.body.appendChild(btn);
  });

  window.DailyChallenge = {
    getGrid: () => generateDailyGrid(getDateSeed()),
    saveResult, share: shareResult,
    start: () => {
      const grid = generateDailyGrid(getDateSeed());
      if(window.loadCustomGrid) window.loadCustomGrid(grid);
    },
    dayNumber: getDailyNumber,
  };
})();
