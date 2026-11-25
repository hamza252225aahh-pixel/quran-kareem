export type CorpusEntry = { id: string; label: string; text: string };

export type IlluminatedAnswer =
  | { ok: true; answer: string; references: CorpusEntry[] }
  | { ok: false; error: string };

const STOP_WORDS = new Set([
  "ما", "من", "في", "عن", "على", "الي", "الى", "هل", "كيف", "لماذا", "متى", "اين",
  "هو", "هي", "هم", "ان", "او", "ثم", "هذا", "هذه", "ذلك", "تلك", "التي", "الذي",
  "الذين", "مع", "كان", "يكون", "تكون", "قد", "لقد", "لا", "لم", "لن", "بل", "كل",
  "بين", "عند", "بعد", "قبل", "حول", "معنى", "تفسير", "حكم", "ماهو", "ماهي", "اريد",
]);

type IndexedEntry = { entry: CorpusEntry; norm: string };
let cachedIndex: IndexedEntry[] | null = null;

export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\uFEFF]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/[^\u0621-\u064A0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(question: string): string[] {
  const norm = normalizeArabic(question);
  const tokens = norm.split(" ").filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const expanded = new Set<string>();
  for (const t of tokens) {
    expanded.add(t);
    if (t.startsWith("ال") && t.length >= 4) expanded.add(t.slice(2));
    else if (/^[وبفل]/.test(t) && t.length >= 4) {
      const rest = t.slice(1);
      expanded.add(rest);
      if (rest.startsWith("ال") && rest.length >= 4) expanded.add(rest.slice(2));
    }
  }
  return Array.from(expanded);
}

export function searchCorpus(question: string, entries: IndexedEntry[], limit = 5): CorpusEntry[] {
  const normQ = normalizeArabic(question);
  const keywords = extractKeywords(question);
  if (!keywords.length) return [];

  const scored: { entry: CorpusEntry; score: number }[] = [];
  for (const item of entries) {
    let score = 0;
    if (normQ.length >= 4 && item.norm.includes(normQ)) score += 10;
    for (const kw of keywords) {
      if (item.norm.includes(kw)) score += kw.length >= 4 ? 3 : 1;
    }
    if (score > 0) scored.push({ entry: item.entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

// Cloudflare Worker URL (Gemini answers). Leave empty to use offline search only.
export const ILLUMINATED_WORKER_URL = "";

async function askWorker(question: string, references: CorpusEntry[]): Promise<string | null> {
  if (!ILLUMINATED_WORKER_URL) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(ILLUMINATED_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, references }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string };
    return data.answer?.trim() || null;
  } catch {
    return null;
  }
}

async function loadIndex(): Promise<IndexedEntry[]> {
  if (cachedIndex) return cachedIndex;
  const url = `${import.meta.env.BASE_URL}data/illuminated-corpus.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("تعذر تحميل قاعدة النصوص الموثقة.");
  const raw = (await response.json()) as CorpusEntry[];
  cachedIndex = raw.map((entry) => ({
    entry,
    norm: normalizeArabic(`${entry.label} ${entry.text}`),
  }));
  return cachedIndex;
}

export async function askIlluminated(question: string): Promise<IlluminatedAnswer> {
  const trimmed = question.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "اكتب سؤالًا من ثلاثة أحرف على الأقل." };
  }
  try {
    const index = await loadIndex();
    const matches = searchCorpus(trimmed, index, 5);
    const aiAnswer = await askWorker(trimmed, matches);
    if (aiAnswer) return { ok: true, answer: aiAnswer, references: matches };
    if (!matches.length) {
      return {
        ok: false,
        error: "لم أجد نصًا مطابقًا في القرآن والتفسير الموثق. جرّب إعادة صياغة السؤال بكلمات أوضح.",
      };
    }
    const sections = matches.map((m) => `### ${m.label}\n${m.text.trim()}`);
    const answer = `إليك أقرب النصوص الموثقة من القرآن الكريم والتفسير الميسر لسؤالك:\n\n${sections.join("\n\n---\n\n")}`;
    return { ok: true, answer, references: matches };
  } catch {
    return { ok: false, error: "تعذر البحث في النصوص الموثقة داخل التطبيق. حاول مرة أخرى." };
  }
}
