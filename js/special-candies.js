// Issue #4: New candy types for levels 51-100
const SPECIAL_CANDIES = {
  rainbow: {
    emoji: '🌈', name: 'Rainbow', color: '#ff6b6b',
    description: 'Matches any candy color',
    unlocksAtLevel: 51,
    onMatch(grid, row, col) {
      // Clear all candies of the same color as adjacent
      const adj = grid.getAdjacent(row, col);
      if (adj.length) {
        const targetColor = adj[0].color;
        grid.clearByColor(targetColor);
      }
    }
  },
  diamond: {
    emoji: '💎', name: 'Diamond', color: '#b0e0e6',
    description: 'Destroys entire row AND column',
    unlocksAtLevel: 60,
    onMatch(grid, row, col) {
      grid.clearRow(row);
      grid.clearColumn(col);
    }
  },
  ice: {
    emoji: '🧊', name: 'Ice', color: '#87ceeb',
    description: 'Frozen — must match twice to clear',
    unlocksAtLevel: 65,
    frozenTurns: 2,
    onMatch(grid, row, col, candy) {
      candy.frozenTurns = (candy.frozenTurns || 2) - 1;
      return candy.frozenTurns > 0; // return true to keep candy
    }
  },
  bomb: {
    emoji: '💣', name: 'Bomb', color: '#374151',
    description: 'Explodes — clears 3x3 area',
    unlocksAtLevel: 75,
    onMatch(grid, row, col) {
      for (let r = row-1; r <= row+1; r++)
        for (let c = col-1; c <= col+1; c++)
          grid.clearCell(r, c);
    }
  },
  clock: {
    emoji: '⏰', name: 'Clock', color: '#fcd34d',
    description: 'Adds +5 seconds to timer',
    unlocksAtLevel: 85,
    onMatch(grid, row, col, candy, gameState) {
      if (gameState && gameState.timeLeft !== undefined)
        gameState.timeLeft += 5;
    }
  },
};

function getCandyForLevel(level) {
  return Object.values(SPECIAL_CANDIES).filter(c => c.unlocksAtLevel <= level);
}

window.SpecialCandies = { SPECIAL_CANDIES, getCandyForLevel };
