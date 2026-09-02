"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const stroke = {
  fill: "none",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** AI chip */
function Chip() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <rect x="18" y="18" width="28" height="28" rx="4" />
      <circle cx="32" cy="32" r="6" />
      {[24, 32, 40].map((p) => (
        <g key={p}>
          <line x1={p} y1="8" x2={p} y2="18" />
          <line x1={p} y1="46" x2={p} y2="56" />
          <line x1="8" y1={p} x2="18" y2={p} />
          <line x1="46" y1={p} x2="56" y2={p} />
        </g>
      ))}
    </svg>
  );
}

/** Data center server rack */
function ServerRack() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <rect x="14" y="10" width="36" height="44" rx="4" />
      {[18, 30, 42].map((y) => (
        <g key={y}>
          <line x1="20" y1={y} x2="38" y2={y} />
          <circle cx="44" cy={y} r="1.6" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

/** Energy bolt */
function Bolt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <path d="M36 6 L18 36 H32 L28 58 L48 26 H33 Z" />
    </svg>
  );
}

/** Solar / sun energy */
function Solar() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <circle cx="32" cy="32" r="12" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 32 + Math.cos(a) * 18;
        const y1 = 32 + Math.sin(a) * 18;
        const x2 = 32 + Math.cos(a) * 26;
        const y2 = 32 + Math.sin(a) * 26;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </svg>
  );
}

/** Neural network nodes */
function Network() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <line x1="14" y1="16" x2="50" y2="32" />
      <line x1="14" y1="48" x2="50" y2="32" />
      <line x1="14" y1="16" x2="14" y2="48" />
      <circle cx="14" cy="16" r="5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="48" r="5" fill="currentColor" stroke="none" />
      <circle cx="50" cy="32" r="6" />
    </svg>
  );
}

/** Battery / storage */
function Battery() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      <rect x="10" y="22" width="40" height="20" rx="3" />
      <line x1="54" y1="28" x2="54" y2="36" />
      <path d="M30 26 L24 33 H30 L28 40" />
    </svg>
  );
}

/** Cooling snowflake */
function Snowflake() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" stroke="currentColor" {...stroke}>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i * Math.PI) / 3;
        const x = 32 + Math.cos(a) * 24;
        const y = 32 + Math.sin(a) * 24;
        return <line key={i} x1="32" y1="32" x2={x} y2={y} />;
      })}
    </svg>
  );
}

type Floater = {
  Icon: () => ReactNode;
  left: string;
  top: string;
  size: number;
  color: string;
  duration: number;
  dx: number;
  dy: number;
  rotate: number;
};

const floaters: Floater[] = [
  { Icon: Chip, left: "8%", top: "14%", size: 60, color: "#38e1b0", duration: 17, dx: 30, dy: -24, rotate: 10 },
  { Icon: ServerRack, left: "82%", top: "20%", size: 66, color: "#5b8cff", duration: 21, dx: -34, dy: 26, rotate: -8 },
  { Icon: Bolt, left: "16%", top: "60%", size: 52, color: "#ff6ec7", duration: 15, dx: 26, dy: 30, rotate: 12 },
  { Icon: Solar, left: "88%", top: "64%", size: 58, color: "#b06bff", duration: 23, dx: -28, dy: -30, rotate: -10 },
  { Icon: Network, left: "72%", top: "84%", size: 62, color: "#38e1b0", duration: 19, dx: 32, dy: -22, rotate: 8 },
  { Icon: Battery, left: "30%", top: "34%", size: 50, color: "#5b8cff", duration: 25, dx: -24, dy: 28, rotate: -12 },
  { Icon: Snowflake, left: "50%", top: "78%", size: 54, color: "#7ff0cf", duration: 27, dx: 22, dy: -26, rotate: 14 },
];

function FloatingIcon({ f }: { f: Floater }) {
  return (
    <motion.div
      aria-hidden
      className="absolute opacity-[0.18]"
      style={{ left: f.left, top: f.top, width: f.size, height: f.size, color: f.color }}
      animate={{
        x: [0, f.dx, 0, -f.dx * 0.6, 0],
        y: [0, f.dy, f.dy * 0.4, -f.dy * 0.5, 0],
        rotate: [0, f.rotate, 0, -f.rotate, 0],
      }}
      transition={{ duration: f.duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <f.Icon />
    </motion.div>
  );
}

export default function FloatingIcons() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {floaters.map((f, i) => (
        <FloatingIcon key={i} f={f} />
      ))}
    </div>
  );
}
