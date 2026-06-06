"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  eventId: number;
  title: string;
  priceInPaise: number;
};

type RegisterResponse =
  | { kind: "free"; ticketCode: string; registrationId: string }
  | { kind: "paid"; registrationId: string; orderId: string; amountPaise: number; keyId: string }
  | { error: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const sc = document.createElement("script");
    sc.src = "https://checkout.razorpay.com/v1/checkout.js";
    sc.onload = () => resolve(true);
    sc.onerror = () => resolve(false);
    document.body.appendChild(sc);
  });
}

const inputCls =
  "w-full rounded-xl border border-line/15 bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-line/40";

export function EventRegistration({ eventId, title, priceInPaise }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const priceLabel =
    priceInPaise > 0
      ? `₹${(priceInPaise / 100).toLocaleString("en-IN")}`
      : "Free";

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, ...form }),
      });
      const data: RegisterResponse = await res.json();
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Registration failed");
      }
      if (data.kind === "free") {
        setTicket(data.ticketCode);
        return;
      }
      // Paid → open Razorpay checkout.
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) throw new Error("Could not load payment checkout");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Woxsen Student Council",
        description: title,
        order_id: data.orderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#0a0a0a" },
        // UPI is the dominant rail for students — surface it first, with app
        // intent (GPay/PhonePe/Paytm deep-links on mobile), QR (desktop) and
        // VPA collect. The remaining methods (cards/netbanking) show below.
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [
                  { method: "upi", flows: ["intent", "qr", "collect"] },
                ],
              },
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const v = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ registrationId: data.registrationId, ...resp }),
          });
          const vd = await v.json();
          if (v.ok && vd.ticketCode) setTicket(vd.ticketCode);
          else setError(vd.error || "Payment verification failed");
        },
      });
      rzp.open();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" />
        <p className="text-sm text-ink">You&apos;re registered!</p>
        <div className="rounded-xl border border-line/15 bg-surface-2 p-3">
          <span className="kicker text-subtle">Your ticket</span>
          <p className="mt-1 flex items-center justify-center gap-2 font-mono text-lg text-ink">
            <Ticket className="h-4 w-4" /> {ticket}
          </p>
        </div>
        <p className="text-xs text-subtle">Save this code — you&apos;ll need it at check-in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={register} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="kicker">Register</span>
        <span className="text-sm font-medium text-ink">{priceLabel}</span>
      </div>
      <input
        required
        placeholder="Full name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className={inputCls}
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className={inputCls}
      />
      <input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        className={inputCls}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Processing…" : priceInPaise > 0 ? `Pay ${priceLabel} & register` : "Register"}
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
