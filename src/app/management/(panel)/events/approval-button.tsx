"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { publishEvent } from "./actions";
import { Button } from "@/components/ui/button";

export function ApprovalButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => publishEvent(id))}
    >
      <Check className="h-4 w-4" />
      {pending ? "Publishing…" : "Approve & publish"}
    </Button>
  );
}
