// Issue #10: Keyboard navigation and accessibility for Sweet Crush
(function(){
  let focusRow = 0, focusCol = 0, selected = null;
  const GRID_SIZE = 8;

  function getCell(r, c) {
    return document.querySelector(`.game-cell[data-row="${r}"][data-col="${c}"]`);
  }

  function focusCell(r, c) {
    if(r<0||r>=GRID_SIZE||c<0||c>=GRID_SIZE) return;
    const prev = getCell(focusRow, focusCol);
    if(prev) prev.removeAttribute('data-focused');
    focusRow=r; focusCol=c;
    const cell = getCell(r,c);
    if(cell){
      cell.setAttribute('data-focused','true');
      cell.focus();
    }
  }

  document.addEventListener('keydown', e => {
    if(!document.querySelector('.game-cell')) return;
    switch(e.key){
      case 'ArrowUp':    e.preventDefault(); focusCell(focusRow-1, focusCol); break;
      case 'ArrowDown':  e.preventDefault(); focusCell(focusRow+1, focusCol); break;
      case 'ArrowLeft':  e.preventDefault(); focusCell(focusRow,   focusCol-1); break;
      case 'ArrowRight': e.preventDefault(); focusCell(focusRow,   focusCol+1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        const cell = getCell(focusRow, focusCol);
        if(cell) cell.click();
        break;
    }
  });

  // High contrast mode
  function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    localStorage.setItem('crushHighContrast', document.body.classList.contains('high-contrast'));
  }

  // Reduced motion
  function toggleReducedMotion() {
    document.body.classList.toggle('reduced-motion');
    localStorage.setItem('crushReducedMotion', document.body.classList.contains('reduced-motion'));
  }

  // Restore preferences
  window.addEventListener('load', () => {
    if(localStorage.getItem('crushHighContrast')==='true') document.body.classList.add('high-contrast');
    if(localStorage.getItem('crushReducedMotion')==='true') document.body.classList.add('reduced-motion');
  });

  window.A11y = { toggleHighContrast, toggleReducedMotion };
})();
