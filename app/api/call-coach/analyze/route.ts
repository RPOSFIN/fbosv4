import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

function pickNextAction(suggestions: string[]) {
  const joined = suggestions.join(" ").toLowerCase();
  if (joined.includes("quotation")) return "Send quotation and lock next step date";
  if (joined.includes("follow-up") || joined.includes("follow up")) return "Schedule follow-up reminder";
  if (joined.includes("whatsapp")) return "Send WhatsApp summary";
  return "Update lead and schedule next action";
}

export async function POST(request: Request) {
  const auth = await authorize("call_coach", "create");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const transcript = String(body.transcript || body.text || "").trim();
  if (!transcript) return apiError("transcript is required", 400);

  const leadId = body.leadId ? String(body.leadId) : null;
  const sourceRecordId = body.sourceRecordId ? String(body.sourceRecordId) : null;
  const shouldSave = body.save !== false;

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

  const summary = transcript.slice(0, 200) + (transcript.length > 200 ? "…" : "");
  const crmActions = [
    "Update lead status in CRM",
    "Schedule follow-up reminder",
    "Send WhatsApp summary template",
  ];
  const nextAction = pickNextAction(suggestions);

  let suggestionId: string | null = null;
  if (shouldSave) {
    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("sales_ai_suggestions")
        .insert({
          lead_id: leadId,
          source: "call_coach",
          source_record_type: "transcript",
          source_record_id: sourceRecordId,
          model_provider: "rule_engine",
          model_name: "fbos-call-coach-v1",
          prompt_type: "call_analysis",
          input_text: transcript,
          input_data: {
            transcript_length: transcript.length,
            saved_from: "sales_workbench",
          },
          tone,
          summary,
          suggestions,
          crm_actions: crmActions,
          next_action: nextAction,
          confidence: 0.7,
          created_by: auth.ctx.userId,
        })
        .select("id")
        .single();

      if (!error) suggestionId = data?.id || null;
      else console.warn("[call-coach] failed to save AI suggestion:", error.message);
    }
  }

  return apiSuccess({
    suggestionId,
    tone,
    suggestions,
    crmActions,
    nextAction,
    summary,
  });
}
