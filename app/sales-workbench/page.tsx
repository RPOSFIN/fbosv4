"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import MetricCard from "@/components/command-center/metric-card";
import FollowupsPanel from "@/components/sales/followups-panel";
import SalesDataQualityPanel from "@/components/sales/data-quality-panel";
import ClickUpDeepAuditPanel from "@/components/sales/clickup-deep-audit-panel";
import { pageShell } from "@/components/command-center/theme";
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
  created_at?: string;
  updated_at?: string;
};

type LeadsResponse = { leads?: Lead[]; total?: number } | Lead[];

type MirrorLead = {
  id: string;
  name: string;
  status?: string | null;
  normalized_status?: string;
  list_name?: string | null;
  space_name?: string | null;
  synced_at?: string | null;
};

type AnalyzeResult = {
  suggestionId?: string | null;
  tone: string;
  suggestions: string[];
  crmActions: string[];
  nextAction?: string;
  summary?: string;
};

type AiSuggestion = {
  id: string;
  tone?: string | null;
  summary?: string | null;
  next_action?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  created_at?: string | null;
};

type MirrorResponse = {
  leads: MirrorLead[];
  total: number;
  sampled: number;
  byNormalizedStatus: Record<string, number>;
};

const rangeOptions = [
  ["3d", "Last 3 days"],
  ["7d", "Last 7 days"],
  ["30d", "One month"],
  ["90d", "90 days"],
  ["1y", "One year"],
  ["all", "All time"],
  ["custom", "Custom"],
];

const salesStatuses = [
  ["all", "All Status"],
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["QUALIFIED", "Qualified"],
  ["FOLLOWUP_SCHEDULED", "Followup"],
  ["DETAILS_SHARED", "Details Shared"],
  ["QUOATED", "Quoted"],
  ["NEGOTIATION", "Negotiation"],
  ["NOT_CONNECTED", "Not Connected"],
  ["NOT_INTERESTED", "Not Interested"],
  ["WON", "Won"],
  ["LOST", "Lost"],
];

const crmStatuses = [
  ["", "All Status"],
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["QUALIFIED", "Qualified"],
  ["QUOATED", "Quoted"],
  ["WON", "Won"],
  ["LOST", "Lost"],
];

function buildParams(input: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export default function SalesCallCoachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, won: 0, active: 0, lost: 0 });
  const [mirrorLeads, setMirrorLeads] = useState<MirrorLead[]>([]);
  const [mirrorTotal, setMirrorTotal] = useState(0);
  const [mirrorSummary, setMirrorSummary] = useState<Record<string, number>>({});
  const [mirrorRange, setMirrorRange] = useState("3d");
  const [mirrorStatus, setMirrorStatus] = useState("all");
  const [mirrorSearch, setMirrorSearch] = useState("");
  const [mirrorFrom, setMirrorFrom] = useState("");
  const [mirrorTo, setMirrorTo] = useState("");
  const [crmRange, setCrmRange] = useState("all");
  const [crmStatus, setCrmStatus] = useState("");
  const [crmSearch, setCrmSearch] = useState("");
  const [crmFrom, setCrmFrom] = useState("");
  const [crmTo, setCrmTo] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<"live" | "manual">("live");
  const recRef = useRef<any>(null);
  const behSessionRef = useRef<string | null>(null);
  const lastTranscriptLen = useRef(0);
  const [behaviour, setBehaviour] = useState({ react: 0, respond: 0, sessions: 0 });
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [followupBusyId, setFollowupBusyId] = useState<string | null>(null);
  const [followupMessage, setFollowupMessage] = useState("");

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || null;

  const refreshAiSuggestions = useCallback(() => {
    apiFetch<{ suggestions: AiSuggestion[] }>("/api/sales/ai-suggestions?limit=5")
      .then((res) => setAiSuggestions(res.suggestions || []))
      .catch(console.error);
  }, []);

  const refreshMirrorLeads = useCallback(() => {
    const qs = buildParams({
      range: mirrorRange,
      status: mirrorStatus,
      search: mirrorSearch,
      from: mirrorRange === "custom" ? mirrorFrom : "",
      to: mirrorRange === "custom" ? mirrorTo : "",
      limit: 1000,
    });
    apiFetch<MirrorResponse>(`/api/sales/clickup/mirror-leads?${qs}`)
      .then((res) => {
        setMirrorLeads(res.leads || []);
        setMirrorTotal(res.total || 0);
        setMirrorSummary(res.byNormalizedStatus || {});
      })
      .catch(console.error);
  }, [mirrorRange, mirrorStatus, mirrorSearch, mirrorFrom, mirrorTo]);

  const refreshCrmLeads = useCallback(() => {
    const qs = buildParams({
      page: 1,
      limit: 1000,
      range: crmRange,
      status: crmStatus,
      search: crmSearch,
      from: crmRange === "custom" ? crmFrom : "",
      to: crmRange === "custom" ? crmTo : "",
    });
    apiFetch<LeadsResponse>(`/api/leads?${qs}`)
      .then((res) => {
        const rows = Array.isArray(res) ? res : res.leads || [];
        const total = Array.isArray(res) ? rows.length : res.total ?? rows.length;
        setLeads(rows);
        setLeadTotal(total);
        const won = rows.filter((l) => String(l.status).toUpperCase() === "WON").length;
        const lost = rows.filter((l) => String(l.status).toUpperCase() === "LOST").length;
        setStats({ total, won, lost, active: Math.max(0, total - won - lost) });
      })
      .catch(console.error);
  }, [crmRange, crmStatus, crmSearch, crmFrom, crmTo]);

  useEffect(() => {
    const stats = getBehaviourStats();
    setBehaviour({ react: stats.totalReact, respond: stats.totalRespond, sessions: stats.sessions.length });
  }, [recording, transcript]);

  useEffect(() => {
    refreshCrmLeads();
    refreshMirrorLeads();
    refreshAiSuggestions();
  }, [refreshCrmLeads, refreshMirrorLeads, refreshAiSuggestions]);

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
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text && behSessionRef.current) ingestTranscriptChunk(behSessionRef.current, text);
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
      setBehaviour({ react: stats.totalReact, respond: stats.totalRespond, sessions: stats.sessions.length });
    }, 2000);
    return () => clearInterval(id);
  }, [recording, tab]);

  async function analyze() {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      const res = await apiFetch<AnalyzeResult>("/api/call-coach/analyze", {
        method: "POST",
        body: JSON.stringify({ transcript, save: true, leadId: selectedLeadId || null }),
      });
      setAnalysis(res);
      refreshAiSuggestions();
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  }

  async function markSuggestion(id: string, decision: "accepted" | "rejected") {
    try {
      await apiFetch("/api/sales/ai-suggestions", { method: "PATCH", body: JSON.stringify({ id, decision }) });
      refreshAiSuggestions();
    } catch (e) {
      console.error(e);
    }
  }

  async function createFollowupFromSuggestion(id: string) {
    setFollowupBusyId(id);
    setFollowupMessage("");
    try {
      await apiFetch("/api/sales/followups/from-ai-suggestion", {
        method: "POST",
        body: JSON.stringify({ suggestionId: id }),
      });
      setFollowupMessage("Followup created for tomorrow.");
      refreshAiSuggestions();
      window.dispatchEvent(new Event("sales:followups-changed"));
    } catch (e) {
      console.error(e);
      setFollowupMessage(e instanceof Error ? e.message : "Failed to create followup");
    } finally {
      setFollowupBusyId(null);
    }
  }

  function statusColor(s?: string) {
    const u = String(s || "").toUpperCase();
    if (u === "WON") return "text-emerald-600 font-bold";
    if (u === "LOST" || u === "NOT_INTERESTED") return "text-red-600 font-bold";
    if (u === "NEW") return "text-blue-600 font-bold";
    return "text-orange-600 font-bold";
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Sales & Call Coach" />
      <div className={`${pageShell} space-y-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Leads" value={stats.total} sub="Supabase CRM" accent="blue" />
          <MetricCard label="WON" value={stats.won} sub="Converted" accent="green" />
          <MetricCard label="ACTIVE" value={stats.active} sub="Pipeline" accent="orange" />
          <MetricCard label="LOST" value={stats.lost} sub="Closed" accent="slate" />
          <MetricCard label="AI Saved" value={aiSuggestions.length} sub="latest suggestions" accent="purple" />
          <MetricCard label="Mirror" value={mirrorTotal} sub="ClickUp tasks" accent="green" />
        </div>

        {recording && (
          <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            ● Behaviour capture ON — react/response counts saved locally ({behaviour.sessions} sessions)
          </p>
        )}

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          <SalesDataQualityPanel onLeadUpdated={refreshCrmLeads} />
          <ClickUpDeepAuditPanel />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LeadPanel
            title="MIRROR LEADS (CLICKUP EXECUTION)"
            subtitle="Default last 3 days. ClickUp is execution mirror only; FBOS remains CRM master."
            total={mirrorTotal}
            range={mirrorRange}
            status={mirrorStatus}
            search={mirrorSearch}
            from={mirrorFrom}
            to={mirrorTo}
            statusOptions={salesStatuses}
            onRange={setMirrorRange}
            onStatus={setMirrorStatus}
            onSearch={setMirrorSearch}
            onFrom={setMirrorFrom}
            onTo={setMirrorTo}
            badge="MIRROR"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <MiniStat label="Followup" value={mirrorSummary.FOLLOWUP_SCHEDULED || 0} />
              <MiniStat label="Not Connected" value={mirrorSummary.NOT_CONNECTED || 0} />
              <MiniStat label="Details Shared" value={mirrorSummary.DETAILS_SHARED || 0} />
              <MiniStat label="Not Interested" value={mirrorSummary.NOT_INTERESTED || 0} />
            </div>
            <div className="overflow-auto max-h-[360px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left p-3">Client / Task</th>
                    <th className="text-left p-3">ClickUp Status</th>
                    <th className="text-left p-3">Sales Stage</th>
                    <th className="text-left p-3">Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {mirrorLeads.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium">{m.name || "—"}</td>
                      <td className="p-3 text-slate-600">{m.status || "—"}</td>
                      <td className={`p-3 ${statusColor(m.normalized_status)}`}>{m.normalized_status || "—"}</td>
                      <td className="p-3 text-xs text-slate-500">{m.synced_at ? new Date(m.synced_at).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LeadPanel>

          <LeadPanel
            title="SUPABASE CRM LEADS"
            subtitle="This is current CRM data from Supabase, not hardcoded demo data. Showing up to 1000 rows."
            total={leadTotal}
            range={crmRange}
            status={crmStatus}
            search={crmSearch}
            from={crmFrom}
            to={crmTo}
            statusOptions={crmStatuses}
            onRange={setCrmRange}
            onStatus={setCrmStatus}
            onSearch={setCrmSearch}
            onFrom={setCrmFrom}
            onTo={setCrmTo}
            badge="SUPABASE LIVE"
          >
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left p-3">Client</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className={`border-t border-slate-100 hover:bg-slate-50 ${selectedLeadId === l.id ? "bg-blue-50" : ""}`}>
                      <td className="p-3 font-medium">{l.company_name || "—"}</td>
                      <td className={`p-3 ${statusColor(l.status)}`}>{l.status || "—"}</td>
                      <td className="p-3 text-slate-600">{l.contact_person || "—"}</td>
                      <td className="p-3 font-mono text-xs">{l.mobile || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LeadPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <label className="mb-1 block text-xs font-bold uppercase text-blue-700">Link this AI call to CRM lead</label>
              <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800">
                <option value="">No lead selected — save as general AI suggestion</option>
                {leads.slice(0, 250).map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.company_name || "Unnamed Lead"} · {lead.contact_person || "No contact"} · {lead.mobile || "No mobile"}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-blue-700">
                {selectedLead ? `Selected: ${selectedLead.company_name || "Lead"}. Followup will link to this lead.` : "Select a lead before Analyze so followup gets mobile/email actions."}
              </p>
            </div>
            <div className="flex gap-2 mb-3">
              <TabBtn active={tab === "live"} onClick={() => setTab("live")}>Live Recording</TabBtn>
              <TabBtn active={tab === "manual"} onClick={() => setTab("manual")}>Manual Text Entry</TabBtn>
            </div>
            {tab === "live" && (
              <button type="button" onClick={recording ? stopRecording : startRecording} className={`mb-3 px-4 py-2 rounded-lg text-sm font-semibold ${recording ? "bg-red-600 text-white animate-pulse" : "bg-slate-800 text-white"}`}>
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
            <button type="button" onClick={analyze} disabled={analyzing || !transcript.trim()} className="mt-3 w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50">
              {analyzing ? "Analyzing…" : selectedLead ? "Analyze & Save to Selected Lead" : "Analyze & Save with AI Coach"}
            </button>
            {analysis && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-blue-900">Tone: {analysis.tone} {analysis.suggestionId ? `· Saved ${analysis.suggestionId.slice(0, 8)}` : ""}</p>
                <ul className="list-disc pl-5 text-slate-700 space-y-1">{analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                {analysis.nextAction && <p className="text-sm font-semibold text-slate-700">Next: {analysis.nextAction}</p>}
                <p className="text-xs text-slate-500 mt-2">CRM: {analysis.crmActions.join(" · ")}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-3">AI SUGGESTIONS</h3>
              {followupMessage && <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{followupMessage}</p>}
              <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {aiSuggestions.length === 0 ? <p className="text-sm text-slate-500">No saved AI suggestions yet.</p> : aiSuggestions.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-blue-700 uppercase">{s.tone || "analysis"}</p>
                      <p className="text-[11px] text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN") : ""}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-3">{s.summary || "—"}</p>
                    {s.next_action && <p className="mt-2 text-xs font-semibold text-slate-600">Next: {s.next_action}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => markSuggestion(s.id, "accepted")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50" disabled={Boolean(s.accepted_at)}>{s.accepted_at ? "Accepted" : "Accept"}</button>
                      <button type="button" onClick={() => createFollowupFromSuggestion(s.id)} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50" disabled={followupBusyId === s.id}>{followupBusyId === s.id ? "Creating…" : "Create Followup"}</button>
                      <button type="button" onClick={() => markSuggestion(s.id, "rejected")} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50" disabled={Boolean(s.rejected_at)}>{s.rejected_at ? "Rejected" : "Reject"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FollowupsPanel />

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 text-sm mb-3">QUICK ACTIONS: CALL & EMAIL TEAM</h3>
              <div className="space-y-3">
                <ContactRow name="Rahul (Sales)" email="rahul@flexiflair.com" />
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">WhatsApp / Email</p>
                  <a href="https://wa.me/" target="_blank" rel="noreferrer" className="block text-sm text-emerald-600 hover:underline">Open WhatsApp Web →</a>
                  <a href="mailto:sales@flexiflair.com" className="block text-sm text-blue-600 hover:underline mt-1">Email sales team →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadPanel({
  title,
  subtitle,
  total,
  range,
  status,
  search,
  from,
  to,
  statusOptions,
  onRange,
  onStatus,
  onSearch,
  onFrom,
  onTo,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  total: number;
  range: string;
  status: string;
  search: string;
  from: string;
  to: string;
  statusOptions: string[][];
  onRange: (value: string) => void;
  onStatus: (value: string) => void;
  onSearch: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">{badge} · {total}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <select value={range} onChange={(e) => onRange(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
            {rangeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={status} onChange={(e) => onStatus(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search company/task" className="rounded-lg border border-slate-200 px-2 py-2 text-xs" />
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} disabled={range !== "custom"} className="rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-100" />
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)} disabled={range !== "custom"} className="rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-100" />
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold" : "px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"}>{children}</button>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] uppercase font-semibold text-slate-500">{label}</p><p className="text-xl font-black text-slate-900">{value}</p></div>;
}

function ContactRow({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
      <div><p className="font-medium text-sm">{name}</p><p className="text-xs text-slate-500">{email}</p></div>
      <div className="flex gap-2 text-lg"><a href="tel:+919876543210" title="Call">📞</a><a href={`mailto:${email}`} title="Email">💻</a></div>
    </div>
  );
}
