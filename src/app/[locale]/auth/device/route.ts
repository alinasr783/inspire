import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const locale = request.nextUrl.pathname.split("/")[1] ?? "en";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=invalid-link`, request.nextUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "magiclink",
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=expired-link`, request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(`/${locale}`, request.nextUrl.origin));
}
