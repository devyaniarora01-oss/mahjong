/**
 * Table sound: tile clacks and spoken claim call-outs.
 *
 * Clacks are synthesised with Web Audio, so there are no files to ship. Call-outs
 * play a recorded clip when one exists at /audio/calls/<seat>-<call>.mp3 (drop real
 * clips in public/audio/calls: pung, chow, kong, mahjong) and fall back to the
 * browser's own voice until then. Tile sounds can be replaced the same way with
 * /audio/tiles/<name>.mp3 (discard, draw).
 */
export type Call = "pung" | "chow" | "kong" | "mahjong";

const KEY = "mahjong-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
try { enabled = window.localStorage.getItem(KEY) !== "off"; } catch { /* storage unavailable */ }

export const isSoundOn = () => enabled;
export function setSoundOn(on: boolean) {
  enabled = on;
  try { window.localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
  if (!on && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Browsers only allow audio after a click, so call this from one. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  CALL_CLIPS.forEach((url) => void loadClip(url)); // decode now so a call-out is instant when a bot claims
}

// Clips play through the same Web Audio context as the clacks. A context that was unlocked by a click can play
// at any time, whereas a fresh <audio> element is blocked by Safari/iOS when a bot claims on a timer.
const clipBuffers = new Map<string, Promise<AudioBuffer | null>>();
function loadClip(url: string): Promise<AudioBuffer | null> {
  if (!ctx) return Promise.resolve(null);
  if (!clipBuffers.has(url)) {
    const context = ctx;
    clipBuffers.set(url, fetch(url)
      .then((r) => (r.ok && (r.headers.get("content-type") ?? "").includes("audio") ? r.arrayBuffer() : Promise.reject(new Error("no clip"))))
      .then((data) => new Promise<AudioBuffer>((resolve, reject) => context.decodeAudioData(data, resolve, reject)))
      .catch(() => null));
  }
  return clipBuffers.get(url)!;
}
async function playClip(url: string, volume = 1): Promise<boolean> {
  const buffer = await loadClip(url);
  if (!buffer || !ctx || !master) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain); gain.connect(master);
    source.start();
    return true;
  } catch { return false; }
}
const CALL_CLIPS = ["east", "south", "west", "north"].flatMap((seat) => ["pung", "chow", "kong", "mahjong"].map((call) => `/audio/calls/${seat}-${call}.mp3`));

function synthClack(power: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200 + Math.random() * 900;
  band.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(power, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  noise.connect(band); band.connect(gain); gain.connect(master);
  noise.start(t);
  const thunk = ctx.createOscillator();
  thunk.type = "sine";
  thunk.frequency.setValueAtTime(220 + Math.random() * 40, t);
  thunk.frequency.exponentialRampToValueAtTime(110, t + 0.06);
  const thunkGain = ctx.createGain();
  thunkGain.gain.setValueAtTime(power * 0.7, t);
  thunkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  thunk.connect(thunkGain); thunkGain.connect(master);
  thunk.start(t); thunk.stop(t + 0.1);
}

function chime() {
  if (!ctx || !master) return;
  [523, 659, 784].forEach((freq, i) => {
    const t = ctx!.currentTime + 0.35 + i * 0.09;
    const osc = ctx!.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = ctx!.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain); gain.connect(master!);
    osc.start(t); osc.stop(t + 0.55);
  });
}

export function playTile(kind: "discard" | "draw" | "claim") {
  if (!enabled) return;
  unlockAudio();
  void playClip(`/audio/tiles/${kind}.mp3`).then((played) => {
    if (played) return;
    if (kind === "discard") synthClack(0.9);
    else if (kind === "draw") { synthClack(0.75); synthClack(0.3, 0.07); }
    else { synthClack(0.9); synthClack(0.7, 0.11); }
  });
}

const SPOKEN: Record<Call, string> = { pung: "Pung!", chow: "Chow!", kong: "Kong!", mahjong: "Mahjong!" };
const PITCH: Record<string, number> = { east: 1, south: 1.2, west: 0.8, north: 0.65 };

export function playCall(call: Call, seat: string) {
  if (!enabled) return;
  unlockAudio();
  void playClip(`/audio/calls/${seat}-${call}.mp3`).then((played) => {
    if (!played && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(SPOKEN[call]);
        utterance.lang = "en-US";
        utterance.rate = 1.05;
        utterance.pitch = PITCH[seat] ?? 1;
        window.speechSynthesis.speak(utterance);
      } catch { /* speech unavailable */ }
    }
    if (call === "mahjong") chime();
  });
}
