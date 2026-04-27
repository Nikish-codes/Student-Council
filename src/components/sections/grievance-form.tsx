"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    category: z.enum(["academic", "campus", "harassment", "other"]),
    subject: z.string().min(4, "A short subject helps us route this faster."),
    message: z.string().min(20, "Please share a bit more detail (20+ characters)."),
    anonymous: z.boolean(),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  })
  .refine((d) => d.anonymous || (d.email && d.email.length > 0), {
    path: ["email"],
    message: "Email is required unless you submit anonymously.",
  });

type FormValues = z.infer<typeof schema>;

const CATEGORIES: { value: FormValues["category"]; label: string }[] = [
  { value: "academic", label: "Academic" },
  { value: "campus", label: "Campus / Hostel" },
  { value: "harassment", label: "Harassment / Conduct" },
  { value: "other", label: "Other" },
];

export function GrievanceForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "academic", anonymous: false },
  });

  const anonymous = watch("anonymous");
  const category = watch("category");

  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 800));
    // v1: open mail draft. Replace with API/Forms endpoint when wired up.
    const body = encodeURIComponent(
      `Category: ${values.category}\nSubject: ${values.subject}\n\n${values.message}\n\n${
        values.anonymous ? "(Submitted anonymously)" : `From: ${values.email}`
      }`,
    );
    window.location.href = `mailto:grievance@woxsen.edu.in?subject=${encodeURIComponent(
      `[${values.category}] ${values.subject}`,
    )}&body=${body}`;
    toast.success("Opening your mail client to send the grievance.");
    reset();
  };

  return (
    <form
      id="grievance-form"
      onSubmit={handleSubmit(onSubmit)}
      className="surface-card space-y-7 p-7 sm:p-10"
    >
      <div>
        <span className="kicker">Category</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setValue("category", c.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200",
                category === c.value
                  ? "border-ink bg-ink text-bg"
                  : "border-line/15 text-muted hover:border-line/30 hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Subject" error={errors.subject?.message}>
        <input
          {...register("subject")}
          placeholder="A one-line summary"
          className="h-11 w-full rounded-lg border border-line/10 bg-bg/40 px-4 text-sm text-ink placeholder:text-subtle focus:border-line/40 focus:outline-none"
        />
      </Field>

      <Field label="Details" error={errors.message?.message}>
        <textarea
          {...register("message")}
          rows={6}
          placeholder="Walk us through what happened, when, and what would help."
          className="w-full resize-none rounded-lg border border-line/10 bg-bg/40 p-4 text-sm leading-relaxed text-ink placeholder:text-subtle focus:border-line/40 focus:outline-none"
        />
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-line/10 bg-bg/40 p-4">
        <div>
          <p className="text-sm text-ink">Submit anonymously</p>
          <p className="text-xs text-muted">
            Your identity will not be shared with the committee.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={anonymous}
          onClick={() => setValue("anonymous", !anonymous)}
          className={cn(
            "relative h-6 w-11 rounded-full border border-line/15 transition-colors",
            anonymous ? "bg-ink" : "bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300",
              anonymous ? "left-5 bg-bg" : "left-0.5 bg-ink",
            )}
          />
        </button>
      </div>

      {!anonymous && (
        <Field label="Your email" error={errors.email?.message}>
          <input
            type="email"
            {...register("email")}
            placeholder="you@woxsen.edu.in"
            className="h-11 w-full rounded-lg border border-line/10 bg-bg/40 px-4 text-sm text-ink placeholder:text-subtle focus:border-line/40 focus:outline-none"
          />
        </Field>
      )}

      <div className="flex items-center justify-between border-t border-line/10 pt-6">
        <p className="max-w-md text-xs text-subtle">
          By submitting, you confirm the information shared is true to the best
          of your knowledge. Confidentiality is maintained throughout review.
        </p>
        <Button type="submit" disabled={isSubmitting} size="md">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit grievance
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="kicker block">{label}</span>
      {children}
      {error && (
        <span className="block text-xs text-ink/80">{error}</span>
      )}
    </label>
  );
}
