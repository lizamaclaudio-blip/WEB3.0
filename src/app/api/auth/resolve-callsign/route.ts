import { NextRequest, NextResponse } from "next/server";
import { restSingle } from "@/lib/supabase/rest-server";

export const dynamic = "force-dynamic";

type ProfileRow = { email?: string | null; callsign?: string | null };

export async function GET(request: NextRequest) {
  const callsign = request.nextUrl.searchParams.get("callsign")?.trim().toUpperCase();
  if (!callsign) return NextResponse.json({ error: "Falta callsign." }, { status: 400 });

  const profile = await restSingle<ProfileRow>(
    "pilot_profiles",
    `select=email,callsign&callsign=eq.${encodeURIComponent(callsign)}&limit=1`,
    { preferAdmin: true }
  );

  if (!profile?.email) {
    return NextResponse.json({ error: "Callsign no encontrado o sin correo asociado." }, { status: 404 });
  }

  return NextResponse.json({ email: profile.email, callsign: profile.callsign });
}
