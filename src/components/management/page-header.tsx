import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  kicker,
  title,
  newHref,
  newLabel = "New",
}: {
  kicker: string;
  title: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="kicker text-subtle">{kicker}</p>
        <h1 className="display mt-1 text-3xl">{title}</h1>
      </div>
      {newHref ? (
        <Button asChild>
          <Link href={newHref}>
            <Plus className="h-4 w-4" /> {newLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * A titled group of fields inside an EditorShell. Once an editor grows past a
 * handful of inputs (the club editor is ~20), an undifferentiated column of
 * labels is hard to scan — this puts a rule and a heading between the sections.
 */
export function Fieldset({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-line/10 pt-7 first:border-0 first:pt-0">
      <div>
        <h2 className="kicker text-ink">{title}</h2>
        {hint ? <p className="mt-1 text-[11px] text-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EditorShell({
  kicker,
  title,
  children,
  action,
}: {
  kicker: string;
  title: string;
  action: (fd: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="kicker text-subtle">{kicker}</p>
        <h1 className="display mt-1 text-3xl">{title}</h1>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </form>
  );
}
