import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Temporary diagnostic — DELETE after confirming keys are correct.
export async function GET() {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return NextResponse.json({
    keyId: id ? `${id.slice(0, 12)}…${id.slice(-4)}` : "(empty)",
    secretLen: secret.length,
    secretPrefix: secret ? secret.slice(0, 4) : "(empty)",
    configured: Boolean(id && secret),
  });
}
