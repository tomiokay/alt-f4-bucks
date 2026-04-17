import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    // PKCE flow — exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  if (token_hash && type) {
    // Token hash flow (email links) — verify OTP
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "signup" | "email",
    });
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/settings", request.url));
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Fallback — redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}
