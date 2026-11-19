/**
 * AudioManager - 音效管理
 * 使用 Web Audio API 程序化合成所有音效，不依赖外部文件
 */
(function(global) {
  'use strict';

  class AudioManager {
    constructor() {
      this.audioContext = null;
      this.masterGain = null;
      this.enabled = true;
      this.initialized = false;
      this.engineOscillator = null;
      this.engineGain = null;
    }

    init() {
      if (this.initialized) return;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.audioContext.destination);
        this.initialized = true;
      } catch (e) {
        console.warn('Web Audio not supported');
        this.enabled = false;
      }
    }

    resume() {
      if (!this.initialized) this.init();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.masterGain) {
        this.masterGain.gain.value = this.enabled ? 0.3 : 0;
      }
      return this.enabled;
    }

    isEnabled() {
      return this.enabled;
    }

    // 播放短促音效
    playTone(frequency, duration, type, volume, sweepTo) {
      if (!this.enabled || !this.initialized) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(frequency, now);

      if (sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
      }

      gain.gain.setValueAtTime(volume || 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    }

    // 收集道具音效
    playCollect() {
      this.playTone(880, 0.1, 'sine', 0.2, 1320);
      setTimeout(() => this.playTone(1320, 0.08, 'sine', 0.15, 1760), 50);
    }

    // 护盾获取音效
    playShield() {
      this.playTone(440, 0.15, 'triangle', 0.2, 880);
      setTimeout(() => this.playTone(660, 0.15, 'triangle', 0.15, 1100), 60);
    }

    // 加速音效
    playBoost() {
      this.playTone(220, 0.2, 'sawtooth', 0.15, 660);
    }

    // 稀有道具音效
    playRare() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((note, i) => {
        setTimeout(() => this.playTone(note, 0.12, 'sine', 0.2), i * 60);
      });
    }

    // 碰撞/爆炸音效
    playExplosion() {
      if (!this.enabled || !this.initialized) return;

      const now = this.audioContext.currentTime;

      // 噪声爆炸
      const bufferSize = this.audioContext.sampleRate * 0.5;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.5);

      // 低频撞击
      this.playTone(100, 0.3, 'sine', 0.3, 40);
    }

    // 护盾抵挡音效
    playShieldHit() {
      this.playTone(300, 0.1, 'triangle', 0.3, 600);
      setTimeout(() => this.playTone(600, 0.1, 'sine', 0.2, 800), 30);
    }

    // 开始游戏音效
    playStart() {
      const notes = [440, 554, 659, 880];
      notes.forEach((note, i) => {
        setTimeout(() => this.playTone(note, 0.15, 'sine', 0.2), i * 100);
      });
    }

    // 游戏结束音效
    playGameOver() {
      const notes = [440, 349, 277, 220];
      notes.forEach((note, i) => {
        setTimeout(() => this.playTone(note, 0.3, 'triangle', 0.2), i * 150);
      });
    }

    // 按钮点击音效
    playClick() {
      this.playTone(1000, 0.05, 'square', 0.08);
    }

    // 菜单选择音效
    playSelect() {
      this.playTone(660, 0.08, 'sine', 0.1);
    }

    // 引擎持续音（背景）
    startEngineSound() {
      if (!this.enabled || !this.initialized || this.engineOscillator) return;

      this.engineOscillator = this.audioContext.createOscillator();
      this.engineGain = this.audioContext.createGain();

      this.engineOscillator.type = 'sawtooth';
      this.engineOscillator.frequency.value = 60;

      // 用滤波器让声音更低沉
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      this.engineGain.gain.value = 0.04;

      this.engineOscillator.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOscillator.start();
    }

    stopEngineSound() {
      if (this.engineOscillator) {
        this.engineOscillator.stop();
        this.engineOscillator = null;
        this.engineGain = null;
      }
    }

    setEngineSpeed(speedFactor) {
      if (this.engineOscillator && this.initialized) {
        const baseFreq = 60;
        const targetFreq = baseFreq * (0.8 + speedFactor * 0.5);
        this.engineOscillator.frequency.setTargetAtTime(
          targetFreq,
          this.audioContext.currentTime,
          0.1
        );
      }
    }

    // 完美闪避音效
    playPerfectDodge() {
      this.playTone(1200, 0.08, 'sine', 0.12, 1500);
    }

    // 连击音效
    playCombo(comboCount) {
      const baseFreq = 600 + Math.min(comboCount * 50, 600);
      this.playTone(baseFreq, 0.1, 'triangle', 0.15, baseFreq * 1.2);
    }

    // 激光射击音效 - 短促的高频下滑
    playShoot() {
      if (!this.initialized || this.muted) return;
      try {
        const now = this.audioContext.currentTime;
        // 主振荡器 - 锯齿波下滑
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        // 叠加一个高频正弦增加清脆感
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1800, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc2.connect(gain2);
        gain2.connect(this.audioContext.destination);
        osc2.start(now);
        osc2.stop(now + 0.1);
      } catch (e) {
        // 音频异常容错
      }
    }

    // 激光击毁障碍物音效 - 爆裂噪声+低频冲击
    playLaserHit() {
      if (!this.initialized || this.muted) return;
      try {
        const now = this.audioContext.currentTime;
        // 低频冲击
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        // 噪声爆裂感（用多个正弦模拟）
        for (let i = 0; i < 4; i++) {
          const nOsc = this.audioContext.createOscillator();
          const nGain = this.audioContext.createGain();
          nOsc.type = 'square';
          nOsc.frequency.setValueAtTime(400 + Math.random() * 600, now);
          nOsc.frequency.exponentialRampToValueAtTime(100 + Math.random() * 200, now + 0.15);
          nGain.gain.setValueAtTime(0.04, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          nOsc.connect(nGain);
          nGain.connect(this.audioContext.destination);
          nOsc.start(now);
          nOsc.stop(now + 0.15);
        }
      } catch (e) {
        // 音频异常容错
      }
    }
  }

  global.AudioManager = AudioManager;
})(window);
