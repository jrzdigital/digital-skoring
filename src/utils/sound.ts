/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private lastGongTime: number = 0;
  private lastWhistleTime: number = 0;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // resume if suspended
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime); // High pitched click
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {
      console.warn("Sound playClick error:", e);
    }
  }

  playScore() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5 notch
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.1); // G5 notch

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.36);
    } catch (e) {
      console.warn("Sound playScore error:", e);
    }
  }

  playBuzzer() {
    try {
      this.init();
      if (!this.ctx) return;
      // High intensity square wave buzzer
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(220, this.ctx.currentTime); // Low buzz

      osc2.type = "square";
      osc2.frequency.setValueAtTime(222, this.ctx.currentTime); // slightly detuned

      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 1.1);
      osc2.stop(this.ctx.currentTime + 1.1);
    } catch (e) {
      console.warn("Sound playBuzzer error:", e);
    }
  }

  playBell() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // High pure bell
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.9);
    } catch (e) {
      console.warn("Sound playBell error:", e);
    }
  }

  playGong() {
    try {
      const nowMs = Date.now();
      if (nowMs - this.lastGongTime < 250) return;
      this.lastGongTime = nowMs;

      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Gong sound uses multiple sine/triangle waves at low, non-harmonic frequencies for that metallic "gong" resonance
      const frequencies = [110, 142, 175, 208, 290]; // Fundamental and complex partials
      const oscillators: OscillatorNode[] = [];
      
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.6, now);
      // Nice long resonance decay
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      masterGain.connect(this.ctx.destination);

      frequencies.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        // Base freq is triangle for warmth, partials are sine/saw/tri
        osc.type = idx === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        // Add a subtle pitch drop during play to sound more organic
        osc.frequency.linearRampToValueAtTime(freq * 0.95, now + 2.0);

        const oscGain = this.ctx.createGain();
        // Lower frequencies have higher volume, higher partials have lower volume
        const vol = idx === 0 ? 0.5 : 0.3 / idx;
        oscGain.gain.setValueAtTime(vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 3.2);
        oscillators.push(osc);
      });
    } catch (e) {
      console.warn("Sound playGong error:", e);
    }
  }

  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Arpeggiated C-Major victory fanfare (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.3, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.52);
      });
    } catch (e) {
      console.warn("Sound playVictory error:", e);
    }
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      console.warn("Sound playError error:", e);
    }
  }

  playWhistle() {
    try {
      const nowMs = Date.now();
      if (nowMs - this.lastWhistleTime < 250) return;
      this.lastWhistleTime = nowMs;

      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const duration = 0.65;

      // Two dual-pitch high frequency oscillators typical of athletic pea whistle
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(2600, now);
      osc1.frequency.linearRampToValueAtTime(2850, now + 0.08);
      osc1.frequency.linearRampToValueAtTime(2720, now + duration);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2950, now);
      osc2.frequency.linearRampToValueAtTime(3220, now + 0.08);
      osc2.frequency.linearRampToValueAtTime(3080, now + duration);

      // Tremolo / flutter modulation typical of whistle pea
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(28, now); // 28 Hz rapid flutter
      lfoGain.gain.setValueAtTime(90, now);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.04);
      gain.gain.setValueAtTime(0.6, now + duration - 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);

      lfo.stop(now + duration);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {
      console.warn("Sound playWhistle error:", e);
    }
  }
}

export const sound = new SoundSynthesizer();
