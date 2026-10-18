const MENU_MELODY = [
  329.63, 0, 440, 392, 329.63, 0, 293.66, 220, 261.63, 329.63, 392, 329.63, 293.66, 261.63, 220, 0,
];
const MENU_BASS = [110, 0, 0, 110, 110, 0, 0, 87.31, 130.81, 0, 0, 130.81, 98, 0, 110, 0];

const PLAY_MELODY = [
  440, 0, 523.25, 440, 392, 349.23, 329.63, 0, 392, 0, 493.88, 392, 349.23, 329.63, 293.66, 261.63,
];
const PLAY_BASS = [110, 0, 110, 0, 110, 0, 82.41, 0, 98, 0, 98, 0, 130.81, 0, 110, 0];

type Bed = "off" | "menu" | "play";
type Voice = { osc: OscillatorNode; gain: GainNode };

export function createAudio() {
  let ctx: AudioContext | null = null;
  let muted = false;
  let armed = false;
  let bed: Bed = "off";
  let step = 0;
  let nextAt = 0;
  const music: Voice[] = [];

  function ac() {
    if (!armed || typeof AudioContext === "undefined") return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
    if (muted) return;
    const audio = ac();
    if (!audio) return;
    voice(audio, freq, audio.currentTime + delay, dur, type, gain, false);
  }

  function voice(
    audio: AudioContext,
    freq: number,
    when: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    tracked: boolean,
  ) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    if (!tracked) return;
    const slot: Voice = { osc, gain: g };
    music.push(slot);
    osc.onended = () => {
      const i = music.indexOf(slot);
      if (i >= 0) music.splice(i, 1);
    };
  }

  function hush() {
    if (!ctx) {
      music.length = 0;
      nextAt = 0;
      return;
    }
    const t = ctx.currentTime;
    for (const slot of music) {
      try {
        slot.gain.gain.cancelScheduledValues(t);
        slot.gain.gain.setValueAtTime(Math.max(slot.gain.gain.value, 0.0001), t);
        slot.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        slot.osc.stop(t + 0.05);
      } catch {
        /* already stopped */
      }
    }
    music.length = 0;
    nextAt = 0;
  }

  function pump() {
    const want = bed !== "off" && !muted && !document.hidden;
    if (!want) {
      if (music.length) hush();
      return;
    }
    const audio = ac();
    if (!audio || audio.state !== "running") return;
    const play = bed === "play";
    const melody = play ? PLAY_MELODY : MENU_MELODY;
    const bass = play ? PLAY_BASS : MENU_BASS;
    const beat = play ? 0.2 : 0.34;
    if (nextAt < audio.currentTime) nextAt = audio.currentTime + 0.04;
    const horizon = audio.currentTime + 0.45;
    while (nextAt < horizon) {
      const m = melody[step % melody.length];
      const b = bass[step % bass.length];
      if (m) {
        voice(audio, m, nextAt, play ? 0.18 : 0.42, play ? "square" : "triangle", play ? 0.016 : 0.03, true);
      }
      if (b) {
        voice(audio, b, nextAt, play ? 0.24 : 0.55, play ? "triangle" : "sine", play ? 0.03 : 0.045, true);
      }
      nextAt += beat;
      step++;
    }
  }

  return {
    unlock() {
      armed = true;
      ac();
    },
    sync(next: Bed) {
      if (next !== bed) {
        bed = next;
        hush();
        step = 0;
      }
      pump();
    },
    jump() {
      tone(420, 0.09, "square", 0.04);
      tone(680, 0.12, "square", 0.03, 0.04);
    },
    coin() {
      tone(880, 0.07, "square", 0.04);
      tone(1320, 0.1, "square", 0.035, 0.05);
    },
    stomp() {
      tone(180, 0.1, "sawtooth", 0.05);
      tone(90, 0.14, "square", 0.04, 0.04);
    },
    hurt() {
      tone(220, 0.16, "sawtooth", 0.05);
      tone(110, 0.2, "square", 0.04, 0.06);
    },
    die() {
      tone(300, 0.18, "sawtooth", 0.05);
      tone(160, 0.28, "triangle", 0.04, 0.12);
    },
    checkpoint() {
      tone(520, 0.08, "triangle", 0.04);
      tone(780, 0.12, "triangle", 0.035, 0.07);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "square", 0.04, i * 0.1));
    },
    toggle() {
      muted = !muted;
      if (muted) hush();
      else tone(660, 0.08, "square", 0.04);
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
