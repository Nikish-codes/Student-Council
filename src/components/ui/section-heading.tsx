import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "start" | "center";
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  kicker,
  title,
  description,
  align = "start",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className="max-w-3xl space-y-4">
        {kicker && (
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-line/20" aria-hidden />
            <span className="kicker">{kicker}</span>
          </div>
        )}
        <h2 className="display text-balance text-4xl sm:text-5xl lg:text-6xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-balance text-base text-muted sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
