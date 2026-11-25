import { createFileRoute } from "@tanstack/react-router";
import { TafsirReader } from "@/quran/pages/tafsir";

export const Route = createFileRoute("/tafsir/$number")({
  head: () => ({
    meta: [
      { title: "التفسير | تقوى القلوب | محمد صديق المنشاوي | تطبيق متكامل" },
      { name: "description", content: "التفسير الميسّر لآيات سورة من القرآن الكريم" },
      { property: "og:title", content: "التفسير | تقوى القلوب" },
      { property: "og:description", content: "التفسير الميسّر — مجمع الملك فهد" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TafsirReader,
});
