"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

function LatencyCounter() {
  const value = useMotionValue(438);
  const rounded = useTransform(value, (v) => `${v.toFixed(2)} ms`);
  const [display, setDisplay] = useState("438.00 ms");
  const reduce = useReducedMotion();

  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    if (reduce) {
      value.set(0);
    } else {
      const controls = animate(value, 0, {
        duration: 2.6,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.6,
      });
      return () => {
        controls.stop();
        unsub();
      };
    }
    return unsub;
  }, [value, rounded, reduce]);

  return (
    <span className="font-display tabular-nums text-aurora-cyan">{display}</span>
  );
}

export default function Hero({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const reduce = useReducedMotion();

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 12);
    rotateX.set(-py * 12);
  }

  function onLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const words = title.split(" ");

  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass mb-8 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-aurora-cyan"
      >
        a world without waiting
      </motion.div>

      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ perspective: 800 }}
        className="[transform-style:preserve-3d]"
      >
        <motion.h1
          style={{ rotateX, rotateY }}
          className="font-display text-[clamp(3rem,12vw,9rem)] font-bold leading-[0.95]"
        >
          {words.map((word, wi) => (
            <span key={wi} className="mr-[0.25em] inline-block whitespace-nowrap">
              {word.split("").map((ch, ci) => (
                <motion.span
                  key={ci}
                  className="text-gradient inline-block"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -8 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{
                    delay: 0.15 + (wi * 5 + ci) * 0.04,
                    type: "spring",
                    stiffness: 260,
                    damping: 18,
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </motion.h1>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="mt-8 max-w-xl text-lg text-white/70"
      >
        Latency, going, going&hellip; <LatencyCounter />
      </motion.p>

      <motion.a
        href="#article"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-white/50 hover:text-white"
      >
        <span className="text-xs uppercase tracking-widest">read on</span>
        <motion.span
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-2xl"
        >
          ↓
        </motion.span>
      </motion.a>
    </section>
  );
}
