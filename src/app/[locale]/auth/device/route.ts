import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateDeviceToken } from "@/lib/device-actions";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const locale = request.nextUrl.pathname.split("/")[1] ?? "en";

  if (!token) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=invalid-link`, request.nextUrl.origin)
    );
  }

  const validation = await validateDeviceToken(token);

  if (!validation.success) {
    const errorCode = validation.error === "expired" ? "expired-link" : validation.error === "already-used" ? "expired-link" : "invalid-link";
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=${errorCode}`, request.nextUrl.origin)
    );
  }

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(
    validation.userId
  );

  if (userError || !userData?.user?.email) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=invalid-link`, request.nextUrl.origin)
    );
  }

  const userEmail = userData.user.email;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
  });

  if (linkError || !linkData) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=expired-link`, request.nextUrl.origin)
    );
  }

  const tokenHash = linkData.properties.hashed_token;
  const verificationType = linkData.properties.verification_type;

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType as "magiclink",
  });

  if (verifyError) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=expired-link`, request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(`/${locale}`, request.nextUrl.origin));
}
