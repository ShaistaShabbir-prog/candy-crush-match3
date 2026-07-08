// candy-crush-match3 — Leaderboard with localStorage
const LB_KEY = 'ccm3_leaderboard';

function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
  catch { return []; }
}

function saveScore(score, level) {
  const lb = getLeaderboard();
  const name = localStorage.getItem('ccm3_playerName') || 'Player';
  lb.push({ name, score, level, date: new Date().toISOString() });
  lb.sort((a, b) => b.score - a.score);
  lb.splice(10); // keep top 10
  try { localStorage.setItem(LB_KEY, JSON.stringify(lb)); } catch(e) {}
  renderLeaderboard();
}

function renderLeaderboard() {
  const el = document.getElementById('leaderboard');
  if (!el) return;
  const lb = getLeaderboard();
  if (!lb.length) {
    el.innerHTML = '<p style="color:#8b949e;text-align:center">No scores yet — play to get on the board!</p>';
    return;
  }
  el.innerHTML = '<h3 style="color:#fbbf24;margin:0 0 0.5rem">🏆 Top Scores</h3>' +
    lb.slice(0,10).map((e,i) =>
      '<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid #30363d">' +
      '<span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'  ') + ' ' + e.name + '</span>' +
      '<span style="color:#a78bfa">' + e.score.toLocaleString() + ' (L' + e.level + ')</span>' +
      '</div>'
    ).join('');
}

function setPlayerName() {
  const name = prompt('Enter your name for the leaderboard:', localStorage.getItem('ccm3_playerName') || 'Player');
  if (name) localStorage.setItem('ccm3_playerName', name.slice(0,20));
}

// Auto-render on load
document.addEventListener('DOMContentLoaded', renderLeaderboard);
