// Issue #3: Web Audio API sound effects — no external files needed
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _ctx = null;
let _muted = localStorage.getItem('crushMuted') === 'true';

function getCtx() {
  if (!_ctx) _ctx = new AudioCtx();
  return _ctx;
}

function beep(freq, dur, type = 'sine', vol = 0.3) {
  if (_muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}

const Sounds = {
  match:   () => { beep(523, 0.08); setTimeout(() => beep(659, 0.08), 80); setTimeout(() => beep(784, 0.12), 160); },
  combo3:  () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.07, 'square', 0.2), i*60)); },
  combo4:  () => { [659,784,988,1319].forEach((f,i) => setTimeout(() => beep(f, 0.08, 'sawtooth', 0.15), i*50)); },
  combo5:  () => { [784,988,1175,1568,2093].forEach((f,i) => setTimeout(() => beep(f,0.1,'triangle',0.2),i*40)); },
  levelWin:() => { [523,659,784,1047,1319].forEach((f,i) => setTimeout(()=>beep(f,0.15,'sine',0.25),i*100)); },
  noMatch: () => beep(200, 0.15, 'sawtooth', 0.1),
  toggleMute() {
    _muted = !_muted;
    localStorage.setItem('crushMuted', _muted);
    return _muted;
  },
  isMuted: () => _muted,
};

window.CrushSounds = Sounds;
