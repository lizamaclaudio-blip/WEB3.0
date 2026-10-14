import { inquiryConfigured } from "./inquiry";
import { createHmac } from "node:crypto";

export type InquiryEnvironment = Record<string, string | undefined>;
type InquiryRpcName = "vector_submit_inquiry" | "vector_register_unsubscribe_token" | "vector_unsubscribe";

export function inquiryAddressHash(request: Request, env: InquiryEnvironment = process.env): string {
  if (!inquiryConfigured(env)) throw new Error("Inquiry storage is unavailable");
  // Vercel overwrites this header. Elsewhere never trust caller-supplied IPs.
  const address = env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
  return createHmac("sha256", env.VECTOR_FORM_HASH_SECRET!).update(address).digest("hex");
}

// Server-only adapter: never import this file into a Client Component.
export async function inquiryRpc(name: InquiryRpcName, parameters: Record<string, unknown>, env: InquiryEnvironment = process.env): Promise<unknown> {
  if (!inquiryConfigured(env)) throw new Error("Inquiry storage is unavailable");
  const endpoint = new URL(`/rest/v1/rpc/${name}`, env.SUPABASE_URL!);
  const serverKey = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)!;
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: serverKey };
  // Modern secret keys are opaque API keys, not bearer JWTs.
  if (!serverKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serverKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(parameters), signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Inquiry storage rejected the request");
  return response.json() as Promise<unknown>;
}
