/**
 * Web Audio API synthesizer for Pencak Silat competition sounds (Gong, Horn, Beep).
 */

class SoundGenerator {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Plays a deep traditional martial arts Gong sound (to indicate start/bell).
   */
  public playGong() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Fundamental frequencies for a rich metallic gong
      const freqs = [110, 165, 220, 275, 330, 440];
      
      freqs.forEach((f, index) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        
        osc.type = index === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, now);
        
        // Detune slightly for chorusing effect
        osc.detune.setValueAtTime((index - 2) * 5, now);
        
        // Fade out
        const duration = index === 0 ? 3.0 : 1.5;
        gainNode.gain.setValueAtTime(index === 0 ? 0.3 : 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx!.destination);
        
        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  /**
   * Plays a loud digital buzzer/horn sound (indicates time's up).
   */
  public playHorn() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const duration = 1.2;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(220, now);
      
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(223, now); // Slightly detuned

      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.setValueAtTime(0.25, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  /**
   * Short countdown click/beep.
   */
  public playBeep() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }
}

export const audioSynth = new SoundGenerator();
