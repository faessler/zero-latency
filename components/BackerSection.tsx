"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { PledgeStats } from "@/lib/pledgeStore";

import PledgeForm from "./PledgeForm";

const GOAL_CHF = 100_000_000;

function useCountUp(to: number, active: boolean) {
  const value = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const reduce = useReducedMotion();
  const rounded = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    if (active) {
      if (reduce) value.set(to);
      else animate(value, to, { duration: 1.4, ease: "easeOut" });
    }
    return unsub;
  }, [active, to, value, rounded, reduce]);

  return display;
}

function Snow() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const flakes = Array.from({ length: 22 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map((_, i) => {
        const left = (i * 41) % 100;
        const delay = (i % 8) * 0.7;
        const duration = 6 + (i % 5) * 1.4;
        const size = 3 + (i % 4) * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white/70"
            style={{ left: `${left}%`, top: -10, width: size, height: size }}
            animate={{ y: ["-5%", "115%"], x: [0, i % 2 ? 18 : -18, 0], opacity: [0, 1, 0.2] }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

export default function BackerSection({ initialStats }: { initialStats: PledgeStats }) {
  const [stats, setStats] = useState<PledgeStats>(initialStats);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();

  const percent = Math.min(100, Math.round((stats.totalChf / GOAL_CHF) * 100));
  const raised = useCountUp(stats.totalChf, inView);
  const backers = useCountUp(stats.backers, inView);

  return (
    <section id="back" ref={ref} className="relative mx-auto mb-24 max-w-3xl px-6">
      <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
        <Snow />

        <svg
          aria-hidden
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-40 w-full opacity-25"
        >
          <path
            d="M0,200 L120,70 L180,120 L280,30 L360,110 L470,50 L560,120 L660,60 L760,130 L800,90 L800,200 Z"
            fill="url(#alps2)"
          />
          <path d="M280,30 L305,55 L255,55 Z M470,50 L492,72 L448,72 Z" fill="#ffffff" opacity="0.85" />
          <defs>
            <linearGradient id="alps2" x1="0" y1="0" x2="0" y2="1">
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
            🏔️ Backer program · Now open
          </motion.div>

          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Help us build a data center in the Swiss Alps
          </h2>
          <p className="mt-3 max-w-xl text-white/70">
            Carbon-neutral, alpine-cooled, obsessed with shaving off every last
            millisecond. Pledge your support and put your name on the mountain.
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-end justify-between">
              <span className="font-display text-2xl font-bold text-white">
                CHF {raised.toLocaleString("en-US")}
              </span>
              <span className="text-sm text-white/60">
                of CHF {GOAL_CHF.toLocaleString("en-US")} goal
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-aurora-cyan via-aurora-blue to-aurora-violet"
                initial={{ width: 0 }}
                animate={inView ? { width: `${percent}%` } : { width: 0 }}
                transition={{ duration: reduce ? 0 : 1.4, ease: "easeOut" }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-white/60">
              <span>
                <span className="font-semibold text-white">{backers.toLocaleString("en-US")}</span>{" "}
                {backers === 1 ? "backer" : "backers"}
              </span>
              <span>
                <span className="font-semibold text-aurora-cyan">{percent}%</span> funded
              </span>
            </div>
          </div>

          <div className="mt-9 rounded-2xl border border-white/10 bg-black/20 p-6 md:p-8">
            <h3 className="mb-5 font-display text-xl font-bold text-white">
              Become a backer
            </h3>
            <PledgeForm onPledged={setStats} />
          </div>
        </div>
      </div>
    </section>
  );
}
