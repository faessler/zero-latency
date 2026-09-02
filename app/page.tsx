import ArticleBody from "@/components/ArticleBody";
import FloatingDoodles from "@/components/FloatingDoodles";
import Hero from "@/components/Hero";
import Kickstarter from "@/components/Kickstarter";
import ReadingProgress from "@/components/ReadingProgress";
import { getArticle } from "@/lib/content";

export default async function Home() {
  const article = await getArticle();
  const kickstarterUrl =
    process.env.NEXT_PUBLIC_KICKSTARTER_URL?.trim() || "https://www.kickstarter.com/";

  return (
    <main className="aurora-bg relative min-h-screen">
      <ReadingProgress />
      <FloatingDoodles />

      <div className="relative z-10">
        <Hero title={article.title} />
        <ArticleBody blocks={article.blocks} />
        <Kickstarter url={kickstarterUrl} />

        <footer className="border-t border-white/10 py-10 text-center text-sm text-white/40">
          <p>Zero Latency — a world without waiting.</p>
          {article.source === "sample" ? (
            <p className="mt-1 text-white/25">
              Showing sample content · set <code>GOOGLE_DOC_URL</code> to load the live article.
            </p>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
