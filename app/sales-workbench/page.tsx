"use client";

import { useEffect, useRef, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import MetricCard from "@/components/command-center/metric-card";
import { pageShell, panelPad } from "@/components/command-center/theme";
import { apiFetch } from "@/lib/api/client";
import {
  startBehaviourSession,
  endBehaviourSession,
  ingestTranscriptChunk,
  getBehaviourStats,
} from "@/lib/behaviour/ceo-capture";

type Lead = {
  id: string;
  company_name?: string;
  status?: string;
  contact_person?: string;
  mobile?: string;
  email?: string;
  updated_at?: string;
};

type AnalyzeResult = {
  tone: string;
  suggestions: string[];
  crmActions: string[];
};

export default function SalesCallCoachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ total: 0, won: 0, active: 0, lost: 0 });
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<"live" | "manual">("live");
  const recRef = useRef<any>(null);
  const behSessionRef = useRef<string | null>(null);
  const lastTranscriptLen = useRef(0);
  const [behaviour, setBehaviour] = useState({ react: 0, respond: 0, sessions: 0 });

  useEffect(() => {
    const stats = getBehaviourStats();
    setBehaviour({
      react: stats.totalReact,
      respond: stats.totalRespond,
      sessions: stats.sessions.length,
    });
  }, [recording, transcript]);

  useEffect(() => {
    apiFetch<{ leads?: Lead[] } | Lead[]>("/api/leads?limit=50")
      .then((res) => {
        const rows = Array.isArray(res) ? res : res.leads || [];
        setLeads(rows.slice(0, 20));
        const won = rows.filter((l) => String(l.status).toUpperCase() === "WON").length;
        const lost = rows.filter((l) => String(l.status).toUpperCase() === "LOST").length;
        setStats({ total: rows.length, won, lost, active: rows.length - won - lost });
      })
      .catch(console.error);
  }, []);

  function startRecording() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setTranscript((t) => t + "\n[Mic not supported — type manually in Manual tab]");
      setTab("manual");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (text && behSessionRef.current) {
        ingestTranscriptChunk(behSessionRef.current, text);
      }
      setTranscript((prev) => prev + " " + text);
    };
    rec.onerror = () => stopRecording();
    rec.start();
    recRef.current = rec;
    behSessionRef.current = startBehaviourSession();
    lastTranscriptLen.current = transcript.length;
    setRecording(true);
  }

  function stopRecording() {
    recRef.current?.stop();
    if (behSessionRef.current) {
      endBehaviourSession(behSessionRef.current);
      behSessionRef.current = null;
    }
    setRecording(false);
  }

  useEffect(() => {
    if (!recording || tab !== "live") return;
    const id = setInterval(() => {
      const stats = getBehaviourStats();
      setBehaviour({
        react: stats.totalReact,
        respond: stats.totalRespond,
        sessions: stats.sessions.length,
      });
    }, 2000);
    return () => clearInterval(id);
  }, [recording, tab]);

  async function analyze() {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      const res = await apiFetch<AnalyzeResult>("/api/call-coach/analyze", {
        method: "POST",
        body: JSON.stringify({ transcript }),
      });
      setAnalysis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  }

  function statusColor(s?: string) {
    const u = String(s || "").toUpperCase();
    if (u === "WON") return "text-emerald-600 font-bold";
    if (u === "LOST") return "text-red-600 font-bold";
    if (u === "NEW") return "text-blue-600 font-bold";
    return "text-orange-600 font-bold";
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Sales & Call Coach" />
      <div className={`${pageShell} space-y-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Leads" value={stats.total} sub="GT_LEAD_CRM" accent="blue" />
          <MetricCard label="WON" value={stats.won} sub="Converted" accent="green" />
          <MetricCard label="ACTIVE" value={stats.active} sub="Pipeline" accent="orange" />
          <MetricCard label="LOST" value={stats.lost} sub="Closed" accent="slate" />
          <MetricCard label="CEO Reacts" value={behaviour.react} sub="While recording" accent="red" />
          <MetricCard label="CEO Responds" value={behaviour.respond} sub="localStorage" accent="green" />
        </div>
        {recording && (
          <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            ● Behaviour capture ON — react/response counts saved locally ({behaviour.sessions} sessions)
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">LIVE LEADS (GT_LEAD_CRM)</h2>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
              LIVE
            </span>
          </div>
          <div className="overflow-x-auto max-h-[320px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium">{l.company_name || "—"}</td>
                    <td className={`p-3 ${statusColor(l.status)}`}>{l.status || "—"}</td>
                    <td className="p-3 text-slate-600">{l.contact_person || "—"}</td>
                    <td className="p-3 font-mono text-xs">{l.mobile || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-2 mb-3">
              <TabBtn active={tab === "live"} onClick={() => setTab("live")}>
                Live Recording
              </TabBtn>
              <TabBtn active={tab === "manual"} onClick={() => setTab("manual")}>
                Manual Text Entry
              </TabBtn>
            </div>
            {tab === "live" && (
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`mb-3 px-4 py-2 rounded-lg text-sm font-semibold ${
                  recording
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-slate-800 text-white"
                }`}
              >
                {recording ? "● Stop Recording" : "● Start Recording"}
              </button>
            )}
            <textarea
              value={transcript}
              onChange={(e) => {
                const next = e.target.value;
                if (recording && behSessionRef.current) {
                  const added = next.slice(lastTranscriptLen.current);
                  if (added.trim()) ingestTranscriptChunk(behSessionRef.current, added);
                  lastTranscriptLen.current = next.length;
                }
                setTranscript(next);
              }}
              placeholder="Live transcription will appear here…"
              className="w-full h-44 border border-slate-200 rounded-lg p-3 text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || !transcript.trim()}
              className="mt-3 w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Analyze with AI (Sales Psychology)"}
            </button>
            {analysis && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-blue-900">Tone: {analysis.tone}</p>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500 mt-2">
                  CRM: {analysis.crmActions.join(" · ")}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-3">
              QUICK ACTIONS: CALL & EMAIL TEAM
            </h3>
            <div className="space-y-3">
              <ContactRow name="Rahul (Sales)" email="rahul@flexiflair.com" />
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  WhatsApp / Email
                </p>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-emerald-600 hover:underline"
                >
                  Open WhatsApp Web →
                </a>
                <a
                  href="mailto:sales@flexiflair.com"
                  className="block text-sm text-blue-600 hover:underline mt-1"
                >
                  Email sales team →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
          : "px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
      }
    >
      {children}
    </button>
  );
}

function ContactRow({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-slate-500">{email}</p>
      </div>
      <div className="flex gap-2 text-lg">
        <a href={`tel:+919876543210`} title="Call">📞</a>
        <a href={`mailto:${email}`} title="Email">💻</a>
      </div>
    </div>
  );
}
