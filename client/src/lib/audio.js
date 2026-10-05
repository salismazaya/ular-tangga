class GameAudio {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.sfxEnabled = localStorage.getItem('ut_sfx') !== 'false';
    this.bgmEnabled = localStorage.getItem('ut_bgm') === 'true';
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.35 : 0, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.08 : 0, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfx(enabled) {
    this.init();
    this.sfxEnabled = enabled;
    localStorage.setItem('ut_sfx', String(enabled));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(enabled ? 0.35 : 0, this.ctx.currentTime);
    }
  }

  setBgm(enabled) {
    this.init();
    this.bgmEnabled = enabled;
    localStorage.setItem('ut_bgm', String(enabled));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(enabled ? 0.08 : 0, this.ctx.currentTime);
    }
    if (enabled && !this.bgmPlaying) {
      this.startBgmLoop();
    } else if (!enabled && this.bgmPlaying) {
      this.stopBgmLoop();
    }
  }

  toggleSfx() {
    this.setSfx(!this.sfxEnabled);
    return this.sfxEnabled;
  }

  toggleBgm() {
    this.setBgm(!this.bgmEnabled);
    return this.bgmEnabled;
  }

  // SFX: Dadu Roll
  playRoll() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(140 + Math.random() * 120, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.07);
      }, i * 65);
    }
  }

  // SFX: Pion Melangkah dari block ke block
  playStep(stepIndex = 0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const baseFreq = 380 + (stepIndex % 12) * 25;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // SFX: Naik Tangga
  playLadder() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [330, 440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
      }, idx * 75);
    });
  }

  // SFX: Digigit Ular
  playSnake() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  // SFX: Menang
  playWin() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523, 659, 784, 1046, 784, 1046];
    const times = [0, 140, 280, 420, 600, 780];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
      }, times[i]);
    });
  }

  // Procedural BGM Loop (Upbeat Lo-fi Chiptune Melody)
  startBgmLoop() {
    this.bgmPlaying = true;
    const melody = [
      261.63, 293.66, 329.63, 392.00,
      329.63, 293.66, 261.63, 392.00,
      349.23, 329.63, 293.66, 261.63,
      293.66, 329.63, 392.00, 523.25
    ];

    const tickBgm = () => {
      if (!this.bgmPlaying || !this.bgmEnabled) return;
      this.init();
      if (this.ctx && this.bgmGain) {
        const freq = melody[this.bgmStep % melody.length];
        this.bgmStep++;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
      }
      this.bgmTimer = setTimeout(tickBgm, 250);
    };

    tickBgm();
  }

  stopBgmLoop() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audio = new GameAudio();
