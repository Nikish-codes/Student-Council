"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, outlookComposeFull } from "@/lib/utils";
import type { GrievanceCategory } from "@/lib/schemas";

const schema = z.object({
  category: z.string().min(1, "Pick a category."),
  subject: z.string().min(4, "A short subject helps us route this faster."),
  message: z.string().min(20, "Please share a bit more detail (20+ characters)."),
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function GrievanceForm({
  categories,
  fallbackTo,
}: {
  categories: GrievanceCategory[];
  fallbackTo: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: categories[0]?.value ?? "",
      email: "",
    },
  });

  const category = watch("category");

  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));

    const cat = categories.find((c) => c.value === values.category);
    const to = cat?.to?.trim() || fallbackTo.trim();
    const cc = cat?.cc?.trim() || undefined;
    const subject = `[${values.category}] ${values.subject}`;
    const body = `${values.message}\n\n— Submitted via the Council portal by ${values.email}`;

    window.location.href = outlookComposeFull({ to, cc, subject, body });
    toast.success("Opening Outlook to send your grievance.");
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
          {categories.map((c) => (
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

      <Field label="Your email" error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          placeholder="you@woxsen.edu.in"
          className="h-11 w-full rounded-lg border border-line/10 bg-bg/40 px-4 text-sm text-ink placeholder:text-subtle focus:border-line/40 focus:outline-none"
        />
      </Field>

      <div className="flex items-center justify-between border-t border-line/10 pt-6">
        <p className="max-w-md text-xs text-subtle">
          By submitting, you confirm the information shared is true to the best
          of your knowledge. This opens Outlook with the right inbox pre-filled.
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
