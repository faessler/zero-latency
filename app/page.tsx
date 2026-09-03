import ArticleBody from "@/components/ArticleBody";
import BackerSection from "@/components/BackerSection";
import FloatingIcons from "@/components/FloatingIcons";
import Hero from "@/components/Hero";
import ReadingProgress from "@/components/ReadingProgress";
import { getArticle } from "@/lib/content";
import { getPledgeStats } from "@/lib/pledgeStore";

export default async function Home() {
  const [article, stats] = await Promise.all([getArticle(), getPledgeStats()]);

  return (
    <main className="aurora-bg relative min-h-[100svh]">
      <ReadingProgress />
      <FloatingIcons />

      <div className="relative z-10">
        <Hero title={article.title} />
        <ArticleBody blocks={article.blocks} />
        <BackerSection initialStats={stats} />

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
