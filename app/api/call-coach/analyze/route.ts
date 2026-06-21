import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";

export async function POST(request: Request) {
  const auth = await authorize("call_coach_notes", "create");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const transcript = String(body.transcript || body.text || "").trim();
  if (!transcript) return apiError("transcript is required", 400);

  const lower = transcript.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
    suggestions.push("Price objection detected — value-based reply use karo, ROI aur per-unit cost dikhao.");
  }
  if (lower.includes("later") || lower.includes("call back") || lower.includes("busy")) {
    suggestions.push("Delay signal — specific follow-up slot fix karo aur WhatsApp summary bhejo.");
  }
  if (lower.includes("competitor") || lower.includes("dusra")) {
    suggestions.push("Competition mention — differentiation (quality, dispatch speed, credit terms) highlight karo.");
  }
  if (lower.includes("yes") || lower.includes("ok") || lower.includes("interested")) {
    suggestions.push("Buying signal strong — ab quotation close karo aur next step date lock karo.");
  }
  if (!suggestions.length) {
    suggestions.push(
      "Active listening continue karo — open questions pucho (volume, timeline, decision maker).",
      "Call end se pehle clear next follow-up date CRM mein daalo.",
      "WhatsApp par quotation + previous order reference bhejna helpful rahega."
    );
  }

  const tone =
    lower.includes("angry") || lower.includes("problem")
      ? "empathetic"
      : lower.includes("yes") || lower.includes("great")
        ? "confident-closer"
        : "consultative";

  return apiSuccess({
    tone,
    suggestions,
    crmActions: [
      "Update lead status in CRM",
      "Schedule follow-up reminder",
      "Send WhatsApp summary template",
    ],
    summary: transcript.slice(0, 200) + (transcript.length > 200 ? "…" : ""),
  });
}
