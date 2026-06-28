const STORAGE_KEY = "flexiflair_ceo_behaviour_v1";

export type BehaviourSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  reactCount: number;
  respondCount: number;
  segments: Array<{ text: string; type: "react" | "respond" | "neutral"; at: string }>;
};

const REACT_PATTERNS =
  /\b(no|not|never|wrong|problem|issue|angry|upset|wait|stop|can't|cannot|refuse|delay|complain|frustrated|galti|nahi|mat)\b/i;
const RESPOND_PATTERNS =
  /\b(yes|ok|okay|sure|done|thanks|thank you|agreed|confirm|will do|understood|theek|haan|ji|bilkul|accepted)\b/i;

function loadAll(): BehaviourSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BehaviourSession[]) : [];
  } catch {
    return [];
  }
}

function saveAll(sessions: BehaviourSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export function startBehaviourSession(): string {
  const id = `beh-${Date.now()}`;
  const session: BehaviourSession = {
    id,
    startedAt: new Date().toISOString(),
    reactCount: 0,
    respondCount: 0,
    segments: [],
  };
  const all = loadAll();
  all.unshift(session);
  saveAll(all);
  return id;
}

export function endBehaviourSession(sessionId: string) {
  const all = loadAll();
  const s = all.find((x) => x.id === sessionId);
  if (s) s.endedAt = new Date().toISOString();
  saveAll(all);
}

export function ingestTranscriptChunk(sessionId: string, text: string) {
  if (!text.trim()) return;
  const all = loadAll();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return;

  const type: "react" | "respond" | "neutral" = REACT_PATTERNS.test(text)
    ? "react"
    : RESPOND_PATTERNS.test(text)
      ? "respond"
      : "neutral";

  if (type === "react") s.reactCount++;
  if (type === "respond") s.respondCount++;

  s.segments.push({ text: text.trim().slice(0, 200), type, at: new Date().toISOString() });
  if (s.segments.length > 200) s.segments.length = 200;
  saveAll(all);
}

export function getBehaviourStats() {
  const all = loadAll();
  const latest = all[0];
  const totalReact = all.reduce((n, s) => n + s.reactCount, 0);
  const totalRespond = all.reduce((n, s) => n + s.respondCount, 0);
  return { sessions: all, latest, totalReact, totalRespond };
}

export function getLatestSession() {
  return loadAll()[0] ?? null;
}
