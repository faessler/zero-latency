"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import type { PledgeStats } from "@/lib/pledgeStore";

const PRESETS = [50, 100, 250, 500];

type Status = "idle" | "submitting" | "success" | "error";

interface Fields {
  amountChf: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string; // honeypot
}

const empty: Fields = {
  amountChf: "100",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
};

export default function PledgeForm({
  onPledged,
}: {
  onPledged?: (stats: PledgeStats) => void;
}) {
  const [fields, setFields] = useState<Fields>(empty);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reduce = useReducedMotion();

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    setFieldErrors({});

    try {
      const res = await fetch("/api/pledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountChf: Number(fields.amountChf),
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          phone: fields.phone,
          company: fields.company,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setFieldErrors(data.fields ?? {});
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      if (data.stats && onPledged) onPledged(data.stats as PledgeStats);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-aurora-cyan/30 bg-aurora-cyan/10 p-8 text-center"
      >
        <motion.div
          className="mb-3 text-5xl"
          initial={reduce ? {} : { rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          🎉
        </motion.div>
        <h3 className="font-display text-2xl font-bold text-white">
          Thank you, {fields.firstName}!
        </h3>
        <p className="mt-2 text-white/70">
          Your pledge of{" "}
          <span className="font-semibold text-aurora-cyan">
            CHF {Number(fields.amountChf).toLocaleString("en-US")}
          </span>{" "}
          is locked in. We&apos;ll be in touch as the mountain rises.
        </p>
        <button
          type="button"
          onClick={() => {
            setFields(empty);
            setStatus("idle");
          }}
          className="mt-6 text-sm text-white/60 underline underline-offset-4 hover:text-white"
        >
          Make another pledge
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">
          Pledge amount (CHF)
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = Number(fields.amountChf) === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => update("amountChf", String(preset))}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-aurora-cyan text-ink"
                    : "bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                CHF {preset}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
            CHF
          </span>
          <input
            type="number"
            min={1}
            step="1"
            inputMode="decimal"
            value={fields.amountChf}
            onChange={(e) => update("amountChf", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-14 pr-4 text-white outline-none transition focus:border-aurora-cyan"
            required
          />
        </div>
        {fieldErrors.amountChf ? (
          <p className="mt-1 text-sm text-aurora-pink">{fieldErrors.amountChf}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          value={fields.firstName}
          onChange={(v) => update("firstName", v)}
          error={fieldErrors.firstName}
          autoComplete="given-name"
        />
        <Field
          label="Last name"
          value={fields.lastName}
          onChange={(v) => update("lastName", v)}
          error={fieldErrors.lastName}
          autoComplete="family-name"
        />
      </div>

      <Field
        label="Email"
        type="email"
        value={fields.email}
        onChange={(v) => update("email", v)}
        error={fieldErrors.email}
        autoComplete="email"
      />
      <Field
        label="Phone"
        type="tel"
        value={fields.phone}
        onChange={(v) => update("phone", v)}
        error={fieldErrors.phone}
        autoComplete="tel"
        placeholder="+41 79 123 45 67"
      />

      {/* Honeypot — visually hidden, ignored by real users */}
      <div aria-hidden className="absolute left-[-9999px] top-[-9999px]" style={{ position: "absolute" }}>
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={fields.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </label>
      </div>

      <AnimatePresence>
        {status === "error" && message ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-aurora-pink"
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={status === "submitting"}
        whileHover={reduce ? undefined : { scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-blue px-8 py-4 font-display text-lg font-bold text-ink shadow-lg shadow-aurora-blue/30 disabled:opacity-60"
      >
        {status === "submitting" ? "Securing your pledge…" : "Become a backer"}
        <motion.span
          aria-hidden
          animate={reduce ? {} : { x: [0, 6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          🚀
        </motion.span>
      </motion.button>

      <p className="text-center text-xs text-white/40">
        🔒 Your details are encrypted (AES-256-GCM) before they are stored.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white/80">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-aurora-cyan"
        required
      />
      {error ? <p className="mt-1 text-sm text-aurora-pink">{error}</p> : null}
    </div>
  );
}
