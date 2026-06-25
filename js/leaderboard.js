// Issue #2: High score leaderboard using localStorage
const LS_KEY = 'sweetCrushScores';
const MAX_SCORES = 10;

function getScores() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function saveScore(name, score, level) {
  const scores = getScores();
  scores.push({ name: name.slice(0, 12), score, level, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(LS_KEY, JSON.stringify(scores.slice(0, MAX_SCORES)));
}

function renderLeaderboard(containerId = 'leaderboard') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const scores = getScores();
  if (!scores.length) { el.innerHTML = '<p style="color:#aaa;text-align:center">No scores yet. Play a game!</p>'; return; }
  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="color:#fbbf24;border-bottom:1px solid rgba(255,255,255,.1)">
        <th style="padding:6px 8px;text-align:left">#</th>
        <th style="padding:6px 8px;text-align:left">Name</th>
        <th style="padding:6px 8px;text-align:right">Score</th>
        <th style="padding:6px 8px;text-align:right">Level</th>
        <th style="padding:6px 8px;text-align:right">Date</th>
      </tr></thead>
      <tbody>${scores.map((s, i) => `<tr style="border-bottom:1px solid rgba(255,255,255,.05)">
        <td style="padding:6px 8px;color:${i<3?'#fbbf24':'#aaa'}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
        <td style="padding:6px 8px;color:#fff">${s.name}</td>
        <td style="padding:6px 8px;text-align:right;color:#86efac">${s.score.toLocaleString()}</td>
        <td style="padding:6px 8px;text-align:right;color:#93c5fd">${s.level}</td>
        <td style="padding:6px 8px;text-align:right;color:#6b7280">${s.date}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

function clearScores() {
  if (confirm('Clear all high scores?')) {
    localStorage.removeItem(LS_KEY);
    renderLeaderboard();
  }
}

window.CrushLeaderboard = { saveScore, renderLeaderboard, getScores, clearScores };
