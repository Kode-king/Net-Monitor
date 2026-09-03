"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";

// Repeating two-tone siren via Web Audio (no asset file needed).
function makeSiren() {
  let ctx = null;
  let timer = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function beep() {
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(920, t0);
    osc.frequency.setValueAtTime(680, t0 + 0.22);
    osc.frequency.setValueAtTime(920, t0 + 0.44);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.64);
  }
  return {
    start() {
      if (timer) return;
      beep();
      timer = setInterval(beep, 1600);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    prime() {
      ensureCtx();
    },
  };
}

export default function CriticalAlarm({ count = 0 }) {
  const { t } = useI18n();
  const [muted, setMuted] = useState(false);
  const sirenRef = useRef(null);

  if (!sirenRef.current && typeof window !== "undefined") {
    sirenRef.current = makeSiren();
  }

  // Browsers need a user gesture before audio can play — prime the context on the first one.
  useEffect(() => {
    const prime = () => sirenRef.current?.prime();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  // auto-clear the mute once the critical alerts are gone
  useEffect(() => {
    if (count === 0 && muted) setMuted(false);
  }, [count, muted]);

  useEffect(() => {
    const s = sirenRef.current;
    if (!s) return;
    if (count > 0 && !muted) s.start();
    else s.stop();
    return () => s.stop();
  }, [count, muted]);

  // flash the tab title while critical
  useEffect(() => {
    if (count === 0) return;
    const base = document.title.replace(/^🚨 /, "");
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `🚨 ${base}` : base;
    }, 1000);
    return () => {
      clearInterval(id);
      document.title = base;
    };
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-4 bg-rose-600 px-4 py-3 text-white shadow-lg">
      <span className="text-lg">🚨</span>
      <span className="font-semibold">{t("alarm.critical", { n: count })}</span>
      <a href="/alerts" className="underline text-sm">{t("alarm.view")}</a>
      <button
        onClick={() => setMuted((m) => !m)}
        className="btn border border-white/40 hover:bg-white/10 px-3 py-1 text-sm"
      >
        {muted ? t("alarm.unmute") : t("alarm.mute")}
      </button>
    </div>
  );
}
