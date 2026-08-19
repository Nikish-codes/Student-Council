import "server-only";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { newId } from "@/lib/tickets";

/**
 * Append-only operations log. Every consequential cockpit action writes one row
 * so the event team has an accountable activity feed. Failures are swallowed
 * (logging must never break the action it records).
 */
export async function logAudit(entry: {
  actorUserId?: number | null;
  eventId?: number | null;
  clubId?: number | null;
  revisionId?: string | null;
  action: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: newId(),
      actorUserId: entry.actorUserId ?? null,
      eventId: entry.eventId ?? null,
      clubId: entry.clubId ?? null,
      revisionId: entry.revisionId ?? null,
      action: entry.action,
      targetId: entry.targetId ?? null,
      meta: entry.meta ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to record:", entry.action, err);
  }
}

export async function getEventAuditLog(eventId: number, limit = 30) {
  return db.query.auditLog.findMany({
    where: eq(auditLog.eventId, eventId),
    orderBy: desc(auditLog.createdAt),
    limit,
    with: { actor: { columns: { name: true } } },
  });
}
