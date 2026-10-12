/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API helper to generate real high-quality sounds without external file dependencies.
class SoundEffects {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      // Create audio context on user interaction to avoid browser policies
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  // Play a soft clean double-chime for standard success/info notification
  playChime() {
    try {
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      
      // Note 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc1.start(now);
      osc1.stop(now + 0.3);
      
      // Note 2
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc2.start(now + 0.08);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio Context is not allowed or failed:', e);
    }
  }

  // Play a soft pulsing beep sound for security alert warnings
  playAlert() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const start = now + (i * 0.25);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, start); // A4
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        
        osc.start(start);
        osc.stop(start + 0.2);
      }
    } catch (e) {
      console.warn('Audio Context is not allowed or failed:', e);
    }
  }

  // Play a soft click sound for keystrokes on numeric 2FA pad
  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // ignore
    }
  }
  // Play a loud buzzer sound for match and round end
  playBuzzer() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      // ignore
    }
  }

  playArenaBuzzer() {
    this.playBuzzer();
  }

  playBeep(_freq?: number, _duration?: number) {
    this.playClick();
  }

  playWarningBeep() {
    this.playAlert();
  }

  playSuccessChime() {
    this.playChime();
  }

  playVictoryFanfare() {
    this.playChime();
  }

  playWhistle() {
    this.playBuzzer();
  }

  playScoreHit(_points?: number) {
    this.playChime();
  }

  playPenalty() {
    this.playAlert();
  }

  playGong() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const frequencies = [110, 142, 175, 208, 290];
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.6, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      masterGain.connect(this.ctx.destination);

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.95, now + 2.0);
        const oscGain = this.ctx.createGain();
        const vol = idx === 0 ? 0.5 : 0.3 / idx;
        oscGain.gain.setValueAtTime(vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3.2);
      });
    } catch (e) {
      // ignore
    }
  }

  toggleMute(): boolean {
    return false;
  }
}

export const soundEffects = new SoundEffects();
export const sound = soundEffects;
export const soundManager = soundEffects;

export function playSoundByKey(key: string): void {
  switch (key) {
    case "gong":
      soundEffects.playGong();
      break;
    case "success_chime":
      soundEffects.playChime();
      break;
    case "warning_beep":
      soundEffects.playAlert();
      break;
    case "buzzer":
      soundEffects.playBuzzer();
      break;
    case "short_beep":
    default:
      soundEffects.playClick();
      break;
  }
}
