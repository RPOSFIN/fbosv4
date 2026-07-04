export function decodeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

export function readTag(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i")
  );
  return match?.[1] ? decodeXml(match[1]) : null;
}

export function readFirstTag(xml: string, tags: string[]): string | null {
  for (const tag of tags) {
    const value = readTag(xml, tag);
    if (value) return value;
  }
  return null;
}

export function readAttr(xml: string, attr: string): string | null {
  const match = xml.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return match?.[1]?.trim() || null;
}

export function readNameAttr(xml: string): string | null {
  return readAttr(xml, "NAME");
}

export function readBlocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escaped}>`, "gi")) || [];
}

export function readSelfClosingBlocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?/>`, "gi")) || [];
}

export function parseAmount(value: string | null): number {
  if (!value) return 0;
  const normalized = value
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOptionalAmount(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseAmount(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTallyDate(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;

  if (cleaned.startsWith("19") || cleaned.startsWith("20")) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }

  return `${cleaned.slice(4, 8)}-${cleaned.slice(2, 4)}-${cleaned.slice(0, 2)}`;
}
