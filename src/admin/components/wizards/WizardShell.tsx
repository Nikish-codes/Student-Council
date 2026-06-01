"use client";

import * as React from "react";
import Link from "next/link";

export type WizardStep = {
  id: string;
  title: string;
  /** Plain-language description shown under the step title. */
  blurb: string;
  /** The form fields for this step. */
  content: React.ReactNode;
  /** Optional validator. Return string = error message, true = ok. */
  validate?: () => true | string;
};

type WizardShellProps = {
  title: string;
  intro: string;
  steps: WizardStep[];
  /** Called once all steps are complete and validated. */
  onSubmit: () => Promise<{ ok: true; viewHref?: string } | { ok: false; error: string }>;
  /** What to show on the final "done" screen. */
  successTitle: string;
  successBlurb: string;
  /** Where to send the user after they hit "Done" on success. */
  doneHref?: string;
  /** Where the "Cancel" link points to (default: /admin). */
  cancelHref?: string;
};

/**
 * A multi-step wizard with progress dots, Back/Next buttons, validation,
 * and a final submit + success screen.
 *
 * The form state lives in the parent — this shell only handles step
 * navigation and the submit lifecycle.
 */
export function WizardShell({
  title,
  intro,
  steps,
  onSubmit,
  successTitle,
  successBlurb,
  doneHref = "/admin",
  cancelHref = "/admin",
}: WizardShellProps) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<null | { viewHref?: string }>(null);

  const isLast = stepIdx === steps.length - 1;
  const step = steps[stepIdx];

  const goNext = () => {
    setError(null);
    if (step.validate) {
      const result = step.validate();
      if (result !== true) {
        setError(result);
        return;
      }
    }
    if (isLast) {
      void handleSubmit();
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  const goBack = () => {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit();
      if (result.ok) {
        setDone({ viewHref: result.viewHref });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="wc-wiz wc-wiz--done">
        <div className="wc-wiz__success">
          <div className="wc-wiz__success-mark" aria-hidden>
            ✓
          </div>
          <h1 className="wc-wiz__success-title">{successTitle}</h1>
          <p className="wc-wiz__success-blurb">{successBlurb}</p>
          <div className="wc-wiz__success-actions">
            {done.viewHref ? (
              <Link href={done.viewHref} className="wc-wiz__btn wc-wiz__btn--secondary">
                Edit further
              </Link>
            ) : null}
            <Link href={doneHref} className="wc-wiz__btn wc-wiz__btn--primary">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wc-wiz">
      <header className="wc-wiz__head">
        <Link href={cancelHref} className="wc-wiz__cancel">
          ← Cancel and go back
        </Link>
        <h1 className="wc-wiz__title">{title}</h1>
        <p className="wc-wiz__intro">{intro}</p>
      </header>

      <ol className="wc-wiz__steps" aria-label="Progress">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className="wc-wiz__step-dot"
            data-state={i < stepIdx ? "done" : i === stepIdx ? "current" : "upcoming"}
          >
            <span className="wc-wiz__step-num">{i < stepIdx ? "✓" : i + 1}</span>
            <span className="wc-wiz__step-label">{s.title}</span>
          </li>
        ))}
      </ol>

      <section className="wc-wiz__body">
        <div className="wc-wiz__step-head">
          <p className="wc-wiz__step-kicker">
            Step {stepIdx + 1} of {steps.length}
          </p>
          <h2 className="wc-wiz__step-title">{step.title}</h2>
          <p className="wc-wiz__step-blurb">{step.blurb}</p>
        </div>
        <div className="wc-wiz__step-fields">{step.content}</div>
        {error ? (
          <div className="wc-wiz__error" role="alert">
            {error}
          </div>
        ) : null}
      </section>

      <footer className="wc-wiz__foot">
        <button
          type="button"
          className="wc-wiz__btn wc-wiz__btn--ghost"
          onClick={goBack}
          disabled={stepIdx === 0 || submitting}
        >
          ← Back
        </button>
        <button
          type="button"
          className="wc-wiz__btn wc-wiz__btn--primary"
          onClick={goNext}
          disabled={submitting}
        >
          {submitting
            ? "Saving…"
            : isLast
              ? "Finish & save"
              : "Next →"}
        </button>
      </footer>
    </div>
  );
}
