import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QualityFilter = "all" | "missing_mobile" | "missing_contact" | "missing_email" | "missing_company" | "has_mobile";

function cleanPhone(raw?: string | null) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return raw || digits;
}

function applyQualityFilter(query: any, filter: QualityFilter) {
  if (filter === "missing_mobile") return query.or("mobile.is.null,mobile.eq.");
  if (filter === "missing_contact") return query.or("contact_person.is.null,contact_person.eq.");
  if (filter === "missing_email") return query.or("email.is.null,email.eq.");
  if (filter === "missing_company") return query.or("company_name.is.null,company_name.eq.");
  if (filter === "has_mobile") return query.not("mobile", "is", null).neq("mobile", "");
  return query;
}

export async function GET(request: Request) {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") || "all") as QualityFilter;
  const search = url.searchParams.get("search")?.trim() || "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "50")));

  const { count: totalLeads, error: totalError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });
  if (totalError) return apiError(totalError.message, 500);

  const countFor = async (field: string) => {
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or(`${field}.is.null,${field}.eq.`);
    if (error) throw error;
    return count || 0;
  };

  try {
    const [missingMobile, missingContactPerson, missingEmail, missingCompany] = await Promise.all([
      countFor("mobile"),
      countFor("contact_person"),
      countFor("email"),
      countFor("company_name"),
    ]);

    let query = supabase
      .from("leads")
      .select("id, company_name, contact_person, mobile, email, status, source, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    query = applyQualityFilter(query, filter);

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,mobile.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) return apiError(error.message, 500);

    const leads = (data || []).map((lead) => ({
      ...lead,
      clean_mobile: cleanPhone(lead.mobile),
      has_mobile: Boolean(String(lead.mobile || "").trim()),
      has_contact_person: Boolean(String(lead.contact_person || "").trim()),
      has_email: Boolean(String(lead.email || "").trim()),
      has_company_name: Boolean(String(lead.company_name || "").trim()),
    }));

    return apiSuccess({
      stats: {
        total_leads: totalLeads || 0,
        missing_mobile: missingMobile,
        missing_contact_person: missingContactPerson,
        missing_email: missingEmail,
        missing_company: missingCompany,
        leads_with_mobile: Math.max(0, (totalLeads || 0) - missingMobile),
      },
      leads,
      total: count || 0,
      filter,
      limit,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to build data quality report", 500);
  }
}
