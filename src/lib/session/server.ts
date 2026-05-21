import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const PW3_SESSION_COOKIE = "pw3_session";
export const PW3_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(PW3_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PW3_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(PW3_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(PW3_SESSION_COOKIE)?.value ?? null;
}
