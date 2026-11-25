import { describe, expect, it } from "vitest";
import { normalizeArabic, searchCorpus } from "@/quran/lib/ask-illuminated";

describe("Illuminated Book offline search", () => {
  it("normalizes Arabic diacritics and letter variants", () => {
    expect(normalizeArabic("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ")).toBe("بسم الله الرحمن");
    expect(normalizeArabic("الصَّلَاةُ وَالزَّكَاةُ")).toBe("الصلاه والزكاه");
  });

  it("finds matching verified passages without any external API", () => {
    const sample = [
      { id: "q1:1", label: "سورة الفاتحة، الآية 1", text: "بسم الله الرحمن الرحيم" },
      { id: "q2:153", label: "سورة البقرة، الآية 153", text: "استعينوا بالصبر والصلاة إن الله مع الصابرين" },
    ].map((entry) => ({ entry, norm: normalizeArabic(`${entry.label} ${entry.text}`) }));

    const results = searchCorpus("ما فضل الصبر والصلاة؟", sample);
    expect(results[0]?.id).toBe("q2:153");
  });
});
