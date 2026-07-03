type SoundName = "tap" | "select" | "scan" | "reveal" | "spin" | "win";

class AudioEngine {
  private context: AudioContext | null = null;
  private enabled = false;
  private loopNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];

  get isEnabled() {
    return this.enabled;
  }

  async toggle() {
    if (this.enabled) {
      this.stopAmbient();
      this.enabled = false;
      return false;
    }
    await this.ensureContext();
    this.enabled = true;
    this.startAmbient();
    return true;
  }

  async resumeFromGesture() {
    await this.ensureContext();
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
  }

  play(name: SoundName) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const output = this.context.createGain();
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
    output.gain.exponentialRampToValueAtTime(0.0001, now + this.duration(name));
    output.connect(this.context.destination);

    if (name === "spin") {
      this.noiseSweep(output, now, 0.85);
      return;
    }

    const oscillator = this.context.createOscillator();
    oscillator.type = name === "win" || name === "reveal" ? "triangle" : "square";
    oscillator.frequency.setValueAtTime(this.frequency(name), now);
    oscillator.frequency.exponentialRampToValueAtTime(this.frequency(name) * 1.8, now + 0.08);
    oscillator.connect(output);
    oscillator.start(now);
    oscillator.stop(now + this.duration(name));
  }

  private async ensureContext() {
    if (this.context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
  }

  private frequency(name: SoundName) {
    return {
      tap: 220,
      select: 330,
      scan: 180,
      reveal: 440,
      spin: 160,
      win: 523,
    }[name];
  }

  private duration(name: SoundName) {
    return {
      tap: 0.1,
      select: 0.16,
      scan: 0.24,
      reveal: 0.48,
      spin: 0.9,
      win: 0.72,
    }[name];
  }

  private startAmbient() {
    if (!this.context || this.loopNodes.length) return;
    const now = this.context.currentTime;
    [43, 86, 129].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.018 : 0.008, now + 0.8);
      oscillator.connect(gain);
      gain.connect(this.context!.destination);
      oscillator.start();
      this.loopNodes.push({ oscillator, gain });
    });
  }

  private stopAmbient() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.loopNodes.forEach(({ oscillator, gain }) => {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      oscillator.stop(now + 0.2);
    });
    this.loopNodes = [];
  }

  private noiseSweep(destination: AudioNode, now: number, duration: number) {
    if (!this.context) return;
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(destination);
    noise.start(now);
    noise.stop(now + duration);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const audioEngine = new AudioEngine();
