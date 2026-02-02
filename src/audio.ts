import { useGameStore } from './store';

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  if (useGameStore.getState().settings.muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1) {
  if (useGameStore.getState().settings.muted) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  noise.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

export const sounds = {
  dig: () => playTone(150, 0.1, 'sine', 0.2),
  flag: () => playTone(800, 0.05, 'square', 0.05),
  explode: () => {
    playNoise(0.5, 0.5);
    playTone(60, 0.5, 'sawtooth', 0.3);
  },
  win: () => {
    const now = audioCtx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      playTone(f, 0.5, 'sine', 0.1);
    });
  }
};
