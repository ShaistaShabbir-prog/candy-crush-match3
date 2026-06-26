// Issue #9: Daily challenge mode — same puzzle for all players each day
const DailyChallenge = {
  getTodaysSeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  },

  getDayNumber() {
    const epoch = new Date('2025-01-01').getTime();
    return Math.floor((Date.now() - epoch) / 86400000) + 1;
  },

  // Seeded random number generator (LCG)
  seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  },

  generateGrid(rows = 8, cols = 8, candyTypes = 6) {
    const rng = this.seededRandom(this.getTodaysSeed());
    return Array.from({length: rows}, () =>
      Array.from({length: cols}, () => Math.floor(rng() * candyTypes) + 1)
    );
  },

  getResult() {
    const key = `daily_${this.getTodaysSeed()}`;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  },

  saveResult(stars, score, moves) {
    const key = `daily_${this.getTodaysSeed()}`;
    const result = { stars, score, moves, date: new Date().toISOString(), day: this.getDayNumber() };
    localStorage.setItem(key, JSON.stringify(result));
    return result;
  },

  generateShareText(stars, score) {
    const day = this.getDayNumber();
    const starEmoji = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const grid = ['🍭🍬🍫', '🍬🍭🍩', '🍫🍩🍭'];
    return `Sweet Crush Daily #${day}\n${starEmoji} ${stars}/3 stars\n${grid.join('\n')}\nScore: ${score.toLocaleString()}`;
  },
};

window.DailyChallenge = DailyChallenge;
