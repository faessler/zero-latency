import type { Block } from "@/lib/types";

import Reveal from "./Reveal";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const sizes: Record<1 | 2 | 3, string> = {
        1: "text-4xl md:text-5xl",
        2: "text-3xl md:text-4xl",
        3: "text-2xl md:text-3xl",
      };
      const Tag = (`h${block.level}` as unknown) as keyof JSX.IntrinsicElements;
      return (
        <Reveal>
          <Tag
            className={`prose-fancy mt-14 mb-2 font-display font-bold text-white ${sizes[block.level]}`}
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </Reveal>
      );
    }
    case "paragraph":
      return (
        <Reveal>
          <p
            className="prose-fancy my-5 text-lg leading-relaxed text-white/80"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </Reveal>
      );
    case "image":
      return (
        <Reveal direction="scale">
          <figure className="group my-12 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.src}
              alt={block.alt}
              loading="lazy"
              className="w-full transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {block.alt ? (
              <figcaption className="bg-white/5 px-4 py-2 text-center text-sm text-white/50">
                {block.alt}
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      );
    case "list":
      return (
        <Reveal>
          {block.ordered ? (
            <ol className="prose-fancy my-5 list-decimal space-y-2 pl-6 text-lg text-white/80">
              {block.items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          ) : (
            <ul className="my-5 space-y-3 text-lg text-white/80">
              {block.items.map((item, i) => (
                <li key={i} className="prose-fancy flex gap-3">
                  <span className="mt-1 text-aurora-cyan">▹</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      );
    case "quote":
      return (
        <Reveal direction="left">
          <blockquote
            className="prose-fancy my-10 border-l-4 border-aurora-violet bg-white/5 px-6 py-5 text-xl italic text-white/90"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </Reveal>
      );
    default:
      return null;
  }
}

export default function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <article id="article" className="mx-auto max-w-2xl px-6 pb-24">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </article>
  );
}
