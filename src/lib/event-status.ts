export const DAY_MS = 86_400_000;

export type EventWindow = {
  date: string;
  endDate?: string | null;
};

/**
 * One source of truth for event timing across public and management surfaces.
 * A missing end date is intentional: the event remains active indefinitely
 * after it starts, until an explicit end date is saved.
 */
export function getEventTiming(event: EventWindow, now = Date.now()) {
  const startMs = +new Date(event.date);
  const endMs = event.endDate
    ? +new Date(event.endDate)
    : Number.POSITIVE_INFINITY;

  return {
    startMs,
    endMs,
    daysAway: Math.round((startMs - now) / DAY_MS),
    isLive: now >= startMs && now <= endMs,
    isPast: now > endMs,
    isOpenEnded: !event.endDate,
  };
}

export function isEventPast(event: EventWindow, now = Date.now()) {
  return getEventTiming(event, now).isPast;
}
