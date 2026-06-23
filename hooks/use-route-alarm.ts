"use client";

import { useCallback, useEffect, useRef } from "react";

type Slot = { time: string; task: string };
type Route = { employee: string; slots: Slot[]; updated_at: string };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function playAlarm() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 600);
  } catch {
    /* ignore */
  }
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/** Route time alarm + voice when task slot is due or route changes */
export function useRouteAlarm(routes: Route[]) {
  const announcedRef = useRef<Set<string>>(new Set());
  const prevRoutesRef = useRef<string>("");

  const checkDueTasks = useCallback(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();

    for (const route of routes) {
      for (const slot of route.slots) {
        const slotMins = timeToMinutes(slot.time);
        const key = `${route.employee}-${slot.time}-${slot.task}`;
        if (Math.abs(mins - slotMins) <= 1 && !announcedRef.current.has(key)) {
          announcedRef.current.add(key);
          playAlarm();
          speak(`Route alert for ${route.employee}. Task: ${slot.task}`);
        }
      }
    }
  }, [routes]);

  useEffect(() => {
    const serialized = JSON.stringify(routes);
    if (prevRoutesRef.current && prevRoutesRef.current !== serialized) {
      const changed = routes[0];
      if (changed?.slots?.length) {
        playAlarm();
        speak(
          `Route updated for ${changed.employee}. ${changed.slots.length} tasks scheduled.`
        );
      }
    }
    prevRoutesRef.current = serialized;
  }, [routes]);

  useEffect(() => {
    checkDueTasks();
    const t = setInterval(checkDueTasks, 30000);
    return () => clearInterval(t);
  }, [checkDueTasks]);
}
