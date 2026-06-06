import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmPaidRegistration } from "@/lib/registrations";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  registrationId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  // Throttle abuse: 16 verify attempts per IP per minute. Legitimate users hit
  // this once per registration; anything beyond is brute-force noise.
  const limit = rateLimit(`verify:${clientIp(req)}`, 16, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;

  // Trust the payment only if the signature checks out.
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    const ticketCode = await confirmPaidRegistration(
      registrationId,
      razorpay_payment_id,
      razorpay_signature,
      razorpay_order_id, // bind: must match the stored razorpayOrderId
    );
    return NextResponse.json({ ok: true, ticketCode });
  } catch (err) {
    console.error("[verify] confirm failed:", err);
    // Don't leak internal error details — generic message to client.
    return NextResponse.json(
      { error: "Could not confirm payment. Please contact us with your payment id." },
      { status: 400 },
    );
  }
}
