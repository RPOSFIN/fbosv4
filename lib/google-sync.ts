import { getGoogleWebappUrl } from "@/lib/google-config";

export async function testGoogleSync() {
  const url = getGoogleWebappUrl();
  if (!url) throw new Error("GOOGLE_WEBAPP_URL not configured");

  const res = await fetch(url);
  const data = await res.json();
  console.log(data);
  return data;
}
