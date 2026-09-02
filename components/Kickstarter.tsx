"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

const GOAL = 2_500_000;
const RAISED = 1_837_400;
const BACKERS = 12_902;
const PERCENT = Math.round((RAISED / GOAL) * 100);

function CountUp({ to, prefix = "", format = false }: { to: number; prefix?: string; format?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const value = useMotionValue(0);
  const [display, setDisplay] = useState(`${prefix}0`);
  const reduce = useReducedMotion();

  const text = useTransform(value, (v) => {
    const n = Math.round(v);
    return `${prefix}${format ? n.toLocaleString("en-US") : n}`;
  });

  useEffect(() => {
    const unsub = text.on("change", setDisplay);
    if (inView) {
      if (reduce) value.set(to);
      else animate(value, to, { duration: 1.8, ease: "easeOut" });
    }
    return unsub;
  }, [inView, to, value, text, reduce]);

  return <span ref={ref}>{display}</span>;
}

function Snow() {
  const reduce = useReducedMotion();
  const flakes = Array.from({ length: 24 });
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 8) * 0.7;
        const duration = 6 + (i % 5) * 1.4;
        const size = 4 + (i % 4) * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white/70"
            style={{ left: `${left}%`, top: -10, width: size, height: size }}
            animate={{ y: ["-5%", "115%"], x: [0, i % 2 ? 20 : -20, 0], opacity: [0, 1, 0.2] }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

export default function Kickstarter({ url }: { url: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barRef, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  return (
    <section className="relative mx-auto mb-24 max-w-3xl px-6">
      <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
        <Snow />

        {/* Alpine skyline */}
        <svg
          aria-hidden
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-40 w-full opacity-30"
        >
          <path
            d="M0,200 L120,70 L180,120 L280,30 L360,110 L470,50 L560,120 L660,60 L760,130 L800,90 L800,200 Z"
            fill="url(#alps)"
          />
          <path d="M280,30 L305,55 L255,55 Z M470,50 L492,72 L448,72 Z" fill="#ffffff" opacity="0.85" />
          <defs>
            <linearGradient id="alps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b8cff" />
              <stop offset="100%" stopColor="#0a0a12" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full bg-aurora-cyan/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-aurora-cyan"
          >
            🏔️ Kickstarter · Live now
          </motion.div>

          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Help us build a data center in the Swiss Alps
          </h2>
          <p className="mt-3 max-w-xl text-white/70">
            Carbon-neutral, alpine-cooled, and obsessed with shaving off every last
            millisecond. Back the campaign and put your name on the mountain.
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-end justify-between">
              <span className="font-display text-2xl font-bold text-white">
                <CountUp to={RAISED} prefix="CHF " format />
              </span>
              <span className="text-sm text-white/60">
                of CHF {GOAL.toLocaleString("en-US")} goal
              </span>
            </div>

            <div
              ref={barRef}
              className="h-3 w-full overflow-hidden rounded-full bg-white/10"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-aurora-cyan via-aurora-blue to-aurora-violet"
                initial={{ width: 0 }}
                animate={inView ? { width: `${PERCENT}%` } : { width: 0 }}
                transition={{ duration: reduce ? 0 : 1.6, ease: "easeOut" }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-white/60">
              <span>
                <span className="font-semibold text-white">
                  <CountUp to={BACKERS} format />
                </span>{" "}
                backers
              </span>
              <span>
                <span className="font-semibold text-aurora-cyan">{PERCENT}%</span> funded
              </span>
            </div>
          </div>

          <motion.a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reduce ? undefined : { scale: 1.04, rotate: -1 }}
            whileTap={{ scale: 0.97 }}
            className="group mt-9 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-blue px-8 py-4 font-display text-lg font-bold text-ink shadow-lg shadow-aurora-blue/30"
          >
            Back us on Kickstarter
            <motion.span
              aria-hidden
              animate={reduce ? {} : { x: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🚀
            </motion.span>
          </motion.a>

          <p className="mt-4 text-xs text-white/40">
            Every pledge is one packet closer to zero.
          </p>
        </div>
      </div>
    </section>
  );
}
