import { createResponsesCall } from "./responses.server";
import corpus from "./corpus.json";

type Entry = { id: string; label: string; text: string };
const CORPUS = corpus as Entry[];
const instructions =
  "أنت مساعد ديني. أجب باللغة العربية اعتمادًا على النصوص الموثقة المرفقة قدر الإمكان، واذكر المراجع بمعرفاتها، ولا تختلق نصوصًا.";

function findMatches(question: string): Entry[] {
  const words = question.split(/\s+/).filter((w) => w.length > 2);
  return CORPUS.map((e) => ({ e, s: words.filter((w) => e.text.includes(w)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => x.e);
}

export async function answerReligiousQuestion(question: string, apiKey: string) {
  const matches = findMatches(question);
  const geminiKey = process.env["GEMINI_API_KEY"] || apiKey;
  const useGemini = Boolean(process.env["GEMINI_API_KEY"]);

  const { result } = createResponsesCall(
    new Request("https://app.internal/illuminated-book"),
    useGemini
      ? {
          apiKey: geminiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
          model: "gemini-2.5-flash",
        }
      : {
          apiKey,
          baseURL: "https://ai.gateway.lovable.dev/v1",
          model: "openai/gpt-6-astra",
        },
    [
      {
        role: "user",
        content: `السؤال: ${question}\n\nنصوص موثقة من التطبيق (قد تكون ذات صلة أو لا):\n${matches.length ? "" : "لا توجد"}${matches.map((r) => `[${r.id}] ${r.label}\n${r.text}`).join("\n\n")}`,
      },
    ],
    instructions
  );
  const answer = await result.text;
  return { answer, references: matches };
}
