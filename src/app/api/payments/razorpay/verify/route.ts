import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmPaidRegistration } from "@/lib/registrations";

export const runtime = "nodejs";

const schema = z.object({
  registrationId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
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
    );
    return NextResponse.json({ ok: true, ticketCode });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
