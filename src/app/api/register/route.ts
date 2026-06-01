import { NextResponse } from "next/server";
import { z } from "zod";
import { registerForEvent } from "@/lib/registrations";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  eventId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  // Throttle abuse: 8 registration attempts per IP per minute.
  const limit = rateLimit(`register:${clientIp(req)}`, 8, 60_000);
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
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }
  try {
    const result = await registerForEvent(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
