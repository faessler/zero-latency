import type { Article } from "./types";

/**
 * Fallback article shown when GOOGLE_DOC_URL is not configured or the fetch fails,
 * so the site always renders something meaningful (and is demoable offline).
 */
export const sampleArticle: Article = {
  title: "Zero Latency",
  source: "sample",
  blocks: [
    {
      type: "paragraph",
      html: "Somewhere between the tick of a clock and the blink of an eye lives the last frontier of computing: <strong>time itself</strong>. This is the story of chasing it down to nothing.",
    },
    {
      type: "heading",
      level: 2,
      html: "The tyranny of the round trip",
    },
    {
      type: "paragraph",
      html: "Every request you send travels a little journey. It hops across switches, waits politely in queues, and crosses continents at roughly two-thirds the speed of light. We have gotten astonishingly good at making that journey short — but <em>short</em> is not the same as <em>gone</em>.",
    },
    {
      type: "image",
      src: "/images/zero-latency-hero.svg",
      alt: "Abstract visualization of data moving at the speed of light",
    },
    {
      type: "paragraph",
      html: "The dream of <strong>zero latency</strong> is not really about faster wires. It is about designing systems where the wait disappears from human perception entirely — where the answer arrives the very instant the question is asked.",
    },
    {
      type: "heading",
      level: 2,
      html: "Cold mountains, hot compute",
    },
    {
      type: "paragraph",
      html: "Data centers are hungry, and mostly for one thing: a way to stay cool. The Swiss Alps offer near-freezing air, abundant hydroelectric power, and a stable, neutral home for the machines that will keep the world in sync.",
    },
    {
      type: "list",
      ordered: false,
      items: [
        "Free cooling from alpine air for most of the year",
        "Carbon-light hydroelectric power on tap",
        "Physically secure, politically stable, geologically calm",
      ],
    },
    {
      type: "image",
      src: "/images/alps-datacenter.svg",
      alt: "A futuristic data center nestled in the Swiss Alps",
    },
    {
      type: "quote",
      html: "The fastest packet is the one that never had to travel far. So we are moving compute to the mountain.",
    },
    {
      type: "heading",
      level: 2,
      html: "What comes next",
    },
    {
      type: "paragraph",
      html: "We are building the first carbon-neutral, alpine-cooled edge data center dedicated to sub-millisecond experiences. It is ambitious, a little bit crazy, and exactly the kind of thing that only happens when enough people decide it should.",
    },
    {
      type: "paragraph",
      html: "If a world without waiting sounds worth building, we would love your help.",
    },
  ],
};
