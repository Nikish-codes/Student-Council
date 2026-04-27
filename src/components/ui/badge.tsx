import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-line/15 bg-line/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted",
      className,
    )}
    {...props}
  />
);
