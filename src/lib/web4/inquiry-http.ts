const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export function inquiryReply(code: string, status: number): Response {
  return Response.json({ ok: status >= 200 && status < 300, code }, { status, headers });
}

type JsonRequest = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readInquiryJson(request: Request, maxBytes = 8192): Promise<JsonRequest> {
  // Next can expose an internal request URL; compare the browser Origin to HTTP Host.
  let source: URL;
  try { source = new URL(request.headers.get("origin") || ""); }
  catch { return { ok: false, response: inquiryReply("ORIGIN_REJECTED", 403) }; }
  const host = request.headers.get("host") || new URL(request.url).host;
  if (source.host !== host || !["http:", "https:"].includes(source.protocol)) return { ok: false, response: inquiryReply("ORIGIN_REJECTED", 403) };
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return { ok: false, response: inquiryReply("INVALID_CONTENT_TYPE", 415) };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, response: inquiryReply("INVALID_INPUT", 400) };
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); return { ok: false, response: inquiryReply("PAYLOAD_TOO_LARGE", 413) }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown };
  } catch { return { ok: false, response: inquiryReply("INVALID_INPUT", 400) }; }
  finally { reader.releaseLock(); }
}
