const url = process.env.GOOGLE_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec";

async function probe(u) {
  const res = await fetch(u, { cache: "no-store", redirect: "follow" });
  const text = await res.text();
  console.log("URL", u.slice(0, 80) + "...");
  console.log("status", res.status);
  try {
    const j = JSON.parse(text);
    console.log("keys", typeof j === "object" && j ? Object.keys(j).slice(0, 15) : "array", Array.isArray(j) ? j.length : "");
    console.log(JSON.stringify(j).slice(0, 400));
  } catch {
    console.log(text.slice(0, 300));
  }
  console.log("---");
}

for (const u of [
  url,
  `${url}?action=health`,
  `${url}?action=export&gid=1663252170`,
  `${url}?action=export&gid=443214491`,
  `${url}?action=finance`,
  `${url}?action=operations`,
]) {
  await probe(u);
}
