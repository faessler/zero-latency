"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type Doodle = {
  emoji: string;
  left: string;
  top: string;
  size: number;
  drift: number; // parallax distance in px across full scroll
  duration: number;
};

const doodles: Doodle[] = [
  { emoji: "⚡", left: "8%", top: "12%", size: 42, drift: -120, duration: 6 },
  { emoji: "🚀", left: "82%", top: "18%", size: 48, drift: -260, duration: 7 },
  { emoji: "⏱️", left: "15%", top: "55%", size: 40, drift: 160, duration: 5.5 },
  { emoji: "❄️", left: "88%", top: "62%", size: 36, drift: 220, duration: 8 },
  { emoji: "🏔️", left: "70%", top: "82%", size: 52, drift: -180, duration: 9 },
  { emoji: "✨", left: "30%", top: "30%", size: 30, drift: 90, duration: 6.5 },
];

function Floaty({ doodle }: { doodle: Doodle }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, doodle.drift]);

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute select-none opacity-40 blur-[0.3px]"
      style={{ left: doodle.left, top: doodle.top, fontSize: doodle.size, y }}
      animate={{ y: [0, -14, 0], rotate: [0, 8, -6, 0] }}
      transition={{
        duration: doodle.duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {doodle.emoji}
    </motion.span>
  );
}

export default function FloatingDoodles() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {doodles.map((d) => (
        <Floaty key={d.emoji + d.left} doodle={d} />
      ))}
    </div>
  );
}
