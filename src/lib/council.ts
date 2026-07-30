/**
 * Pairing co-leads to the lead they work under.
 *
 * The membership sheet records co-leads positionally — "Sports Co Lead" works
 * under "Sports Lead" — with no id linking the two. Rather than invent a
 * foreign key the spreadsheet doesn't have, the pairing is derived from the
 * role string, and derived HERE so the rule exists in exactly one tested place.
 *
 * The trade-off is real: renaming "Sports Lead" in the panel silently orphans
 * "Sports Co Lead". `unpairedCoLeads` exists so the panel can surface that
 * instead of letting it fail quietly.
 */

/** Everything after the base, normalised: "  Sports   Co-Lead " → "sports co lead". */
function normalise(role: string): string {
  return role.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

/**
 * The base of a co-lead role: "Sports Co Lead" → "sports".
 * Returns null for anything that isn't a co-lead.
 */
export function coLeadBase(role: string): string | null {
  const n = normalise(role);
  // "colead" catches the unspaced spelling; the -? handles "co-lead" post-normalise.
  const m = n.match(/^(.*?)\s*\bco\s?lead\b$/);
  const base = m?.[1]?.trim();
  return base ? base : null;
}

/**
 * The base of a lead role: "Sports Lead" → "sports".
 * Returns null for co-leads, so a co-lead never pairs with itself.
 */
export function leadBase(role: string): string | null {
  const n = normalise(role);
  if (coLeadBase(role)) return null;
  const m = n.match(/^(.*?)\s*\blead\b$/);
  const base = m?.[1]?.trim();
  return base ? base : null;
}

type Pairable = { id: string; role: string; memberType: string };

/**
 * Map every lead's id to the co-leads working under them. Members that are
 * neither leads nor co-leads are ignored; a co-lead whose lead is missing is
 * simply absent from the map rather than throwing.
 */
export function attachCoLeads<T extends Pairable>(members: T[]): Map<string, T[]> {
  const leadIdByBase = new Map<string, string>();
  for (const m of members) {
    if (m.memberType === "co_lead") continue;
    const base = leadBase(m.role);
    // First lead wins: two rows claiming "Sports Lead" is a data problem, and
    // silently splitting the co-leads between them would hide it.
    if (base && !leadIdByBase.has(base)) leadIdByBase.set(base, m.id);
  }

  const out = new Map<string, T[]>();
  for (const m of members) {
    if (m.memberType !== "co_lead") continue;
    const base = coLeadBase(m.role);
    if (!base) continue;
    const leadId = leadIdByBase.get(base);
    if (!leadId) continue;
    const list = out.get(leadId);
    if (list) list.push(m);
    else out.set(leadId, [m]);
  }
  return out;
}

/**
 * Co-leads that found no lead to sit under — they'd be invisible on the public
 * page, so the panel flags them.
 */
export function unpairedCoLeads<T extends Pairable>(members: T[]): T[] {
  const paired = new Set(
    [...attachCoLeads(members).values()].flat().map((m) => m.id),
  );
  return members.filter(
    (m) => m.memberType === "co_lead" && !paired.has(m.id),
  );
}
