const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const INSTRUCTIONS =
  "أنت مساعد ديني. أجب باللغة العربية اعتمادًا على النصوص الموثقة المرفقة قدر الإمكان، واذكر المراجع بمعرفاتها، ولا تختلق نصوصًا.";

const STOP_WORDS = new Set([
  "ما","من","في","عن","على","الي","الى","هل","كيف","لماذا","متى","اين",
  "هو","هي","هم","ان","او","ثم","هذا","هذه","ذلك","تلك","التي","الذي",
  "الذين","مع","كان","يكون","تكون","قد","لقد","لا","لم","لن","بل","كل",
  "بين","عند","بعد","قبل","حول","معنى","تفسير","حكم","ماهو","ماهي","اريد",
]);

function normalizeArabic(input) {
  return input
    .replace(/[ً-ٰٟۖ-ۭـ﻿]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/[^ء-ي0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(question) {
  const norm = normalizeArabic(question);
  const tokens = norm.split(" ").filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const expanded = new Set();
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

function searchCorpus(question, corpus, limit = 5) {
  const normQ = normalizeArabic(question);
  const keywords = extractKeywords(question);
  if (!keywords.length) return [];
  const scored = [];
  for (const entry of corpus) {
    const norm = entry._norm || (entry._norm = normalizeArabic(`${entry.label} ${entry.text}`));
    let score = 0;
    if (normQ.length >= 4 && norm.includes(normQ)) score += 10;
    for (const kw of keywords) {
      if (norm.includes(kw)) score += kw.length >= 4 ? 3 : 1;
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

let cachedCorpus = null;
async function loadCorpus(env) {
  if (cachedCorpus) return cachedCorpus;
  const res = await fetch(env.CORPUS_URL);
  if (!res.ok) throw new Error("corpus fetch failed");
  cachedCorpus = await res.json();
  return cachedCorpus;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") {
      return Response.json({ error: "method not allowed" }, { status: 405, headers: CORS });
    }

    let question;
    let provided = null;
    try {
      const body = await request.json();
      question = (body.question || "").trim();
      if (Array.isArray(body.references)) provided = body.references.slice(0, 5);
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400, headers: CORS });
    }
    if (question.length < 3) {
      return Response.json({ error: "question too short" }, { status: 400, headers: CORS });
    }

    try {
      const matches = provided || searchCorpus(question, await loadCorpus(env), 5);
      const context = matches.length
        ? matches.map((r) => `[${r.id}] ${r.label}\n${r.text}`).join("\n\n")
        : "لا توجد";

      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GEMINI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: INSTRUCTIONS },
              {
                role: "user",
                content: `السؤال: ${question}\n\nنصوص موثقة من التطبيق (قد تكون ذات صلة أو لا):\n${context}`,
              },
            ],
          }),
        }
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return Response.json(
          { error: `gemini error ${geminiRes.status}`, detail: errText.slice(0, 300) },
          { status: 502, headers: CORS }
        );
      }

      const data = await geminiRes.json();
      const answer = data.choices?.[0]?.message?.content || "لم أتمكن من الإجابة.";
      return Response.json({ answer, references: matches }, { headers: CORS });
    } catch (e) {
      return Response.json({ error: "internal error", detail: String(e) }, { status: 500, headers: CORS });
    }
  },
};
