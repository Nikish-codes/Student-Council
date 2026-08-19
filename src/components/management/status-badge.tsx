export function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "approved"
      ? "bg-emerald-500/12 text-emerald-400"
      : status === "pending_review"
        ? "bg-amber-500/12 text-amber-300"
        : status === "changes_requested" || status === "declined"
          ? "bg-red-500/12 text-red-300"
          : "bg-line/8 text-muted";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${styles}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
