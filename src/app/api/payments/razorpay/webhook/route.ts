import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmByOrderId } from "@/lib/registrations";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the reliable confirmation path (fires even if the user
 * closes the tab after paying). We verify the HMAC signature over the RAW body
 * before trusting anything, then confirm idempotently.
 *
 * Configure in the Razorpay dashboard with event `payment.captured` and the
 * same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    const entity = payload.payload?.payment?.entity;
    if (entity?.order_id && entity?.id) {
      try {
        await confirmByOrderId(entity.order_id, entity.id);
      } catch (err) {
        console.error("[webhook] confirm failed:", err);
        // 200 anyway so Razorpay doesn't hammer retries for app-level issues.
      }
    }
  }

  return NextResponse.json({ ok: true });
}
