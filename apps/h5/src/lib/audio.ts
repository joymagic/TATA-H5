type SoundName = "tap" | "select" | "scan" | "reveal" | "spin" | "win";

const MUSIC_URL = "/assets/audio/sunlight-in-the-living-room.mp3";

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (method: string, params: Record<string, never>, callback: () => void) => void;
    };
  }
}

class AudioEngine {
  private context: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private enabled = true;
  private loopNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  private ambientMaster: GainNode | null = null;
  private ambientTimer: number | null = null;
  private ambientGeneration = 0;

  get isEnabled() {
    return this.enabled;
  }

  preload() {
    const music = this.ensureMusic();
    music.load();
    void music.play().catch(() => undefined);
  }

  async toggle() {
    if (this.enabled) {
      this.music?.pause();
      this.stopAmbient();
      this.enabled = false;
      return false;
    }
    this.ensureContext();
    const music = this.ensureMusic();
    try {
      await music.play();
    } catch {
      return false;
    }
    this.enabled = true;
    return true;
  }

  async resumeFromGesture() {
    if (!this.enabled) return;
    this.ensureContext();
    await this.resumeMusic();
  }

  resumeFromWeChatBridge() {
    const bridge = window.WeixinJSBridge;
    if (!this.enabled || typeof bridge?.invoke !== "function") return;
    try {
      bridge.invoke("getNetworkType", {}, () => {
        void this.resumeMusic();
      });
    } catch {
      void this.resumeMusic();
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

  private ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }
  }

  private ensureMusic() {
    if (this.music) return this.music;
    const music = new Audio(MUSIC_URL);
    music.loop = true;
    music.preload = "auto";
    music.volume = 0.32;
    this.music = music;
    return music;
  }

  private async resumeMusic() {
    const music = this.ensureMusic();
    if (music.paused) {
      await music.play().catch(() => undefined);
    }
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
    if (!this.context || this.ambientMaster) return;
    const now = this.context.currentTime;
    const master = this.context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.72, now + 1.8);
    master.connect(this.context.destination);
    this.ambientMaster = master;
    this.ambientGeneration += 1;
    this.scheduleAmbientCycle(this.ambientGeneration);
  }

  private stopAmbient() {
    if (!this.context || !this.ambientMaster) return;
    const now = this.context.currentTime;
    const master = this.ambientMaster;
    this.ambientGeneration += 1;
    if (this.ambientTimer !== null) {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    this.loopNodes.forEach(({ oscillator, gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      try {
        oscillator.stop(now + 0.24);
      } catch {
        // The oscillator may already have reached its scheduled stop time.
      }
    });
    this.loopNodes = [];
    this.ambientMaster = null;
    window.setTimeout(() => master.disconnect(), 280);
  }

  private scheduleAmbientCycle(generation: number) {
    if (!this.context || !this.ambientMaster || generation !== this.ambientGeneration) return;

    const beat = 60 / 68;
    const chordDuration = beat * 8;
    const cycleDuration = chordDuration * 4;
    const startsAt = this.context.currentTime + 0.08;
    const progression = [
      { bass: 38, notes: [50, 53, 57, 60, 64] }, // Dm9
      { bass: 34, notes: [46, 50, 53, 57, 62] }, // Bbmaj9
      { bass: 41, notes: [53, 57, 60, 67] }, // Fadd9
      { bass: 36, notes: [48, 52, 55, 62, 64] }, // Cadd9
    ];

    progression.forEach((chord, chordIndex) => {
      const chordStartsAt = startsAt + chordIndex * chordDuration;
      chord.notes.forEach((midi, noteIndex) => {
        this.scheduleTone({
          frequency: this.midiToFrequency(midi),
          startsAt: chordStartsAt,
          duration: chordDuration + 0.35,
          peak: noteIndex === 0 ? 0.013 : 0.008,
          attack: 1.25,
          release: 1.1,
          type: noteIndex % 2 === 0 ? "sine" : "triangle",
          detune: noteIndex % 2 === 0 ? -3 : 3,
        });
      });

      this.scheduleTone({
        frequency: this.midiToFrequency(chord.bass),
        startsAt: chordStartsAt,
        duration: chordDuration,
        peak: 0.025,
        attack: 0.9,
        release: 1.4,
        type: "sine",
      });

      for (let step = 0; step < 8; step += 1) {
        const arpMidi = chord.notes[(step * 2 + chordIndex) % chord.notes.length] + 12;
        this.scheduleTone({
          frequency: this.midiToFrequency(arpMidi),
          startsAt: chordStartsAt + step * beat,
          duration: beat * 1.65,
          peak: step % 4 === 0 ? 0.01 : 0.006,
          attack: 0.04,
          release: beat * 1.25,
          type: "triangle",
          detune: step % 2 === 0 ? -2 : 2,
        });
      }
    });

    this.ambientTimer = window.setTimeout(
      () => this.scheduleAmbientCycle(generation),
      Math.max(1000, (cycleDuration - 0.8) * 1000)
    );
  }

  private scheduleTone({
    frequency,
    startsAt,
    duration,
    peak,
    attack,
    release,
    type,
    detune = 0,
  }: {
    frequency: number;
    startsAt: number;
    duration: number;
    peak: number;
    attack: number;
    release: number;
    type: OscillatorType;
    detune?: number;
  }) {
    if (!this.context || !this.ambientMaster) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const endsAt = startsAt + duration;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    oscillator.detune.setValueAtTime(detune, startsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(peak, startsAt + attack);
    gain.gain.setValueAtTime(peak * 0.72, Math.max(startsAt + attack, endsAt - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
    oscillator.connect(gain);
    gain.connect(this.ambientMaster);
    oscillator.start(startsAt);
    oscillator.stop(endsAt + 0.02);

    const node = { oscillator, gain };
    this.loopNodes.push(node);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.loopNodes = this.loopNodes.filter((item) => item !== node);
    };
  }

  private midiToFrequency(midi: number) {
    return 440 * 2 ** ((midi - 69) / 12);
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
