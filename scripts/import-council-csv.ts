/**
 * Import council members from the membership spreadsheet.
 *
 *   npx tsx scripts/import-council-csv.ts "path/to/SC Members(MEMBERDATA).csv"
 *   npx tsx scripts/import-council-csv.ts <file> --dry     # preview, no writes
 *
 * Idempotent: rows are matched on email (case-insensitive), falling back to a
 * normalised name, so re-running updates people instead of duplicating them.
 * Existing portraits, president messages and hand-edited role addresses are
 * preserved — the CSV only fills what it actually knows.
 *
 * Deliberately NOT imported: roll numbers and personal phone numbers. They are
 * personal data with no column to live in and no business being on a public page.
 *
 * Co-leads import as `memberType: "co_lead"` with no section: they render only
 * inside the expanded card of the lead whose role shares their prefix
 * ("Sports Co Lead" → "Sports Lead"), paired by src/lib/council.ts.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq, isNull, sql } from "drizzle-orm";

import * as schema from "../src/db/schema";
import { councilGroups, councilMembers } from "../src/db/schema";
import { coLeadBase, leadBase } from "../src/lib/council";

// Build the client AFTER dotenv: ESM hoists every `import` above the config()
// call, so importing @/db/client here would capture an unset LIBSQL_URL and
// silently fall back to a local sqlite file.
const db = drizzle(
  createClient({
    url: process.env.LIBSQL_URL!,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  }),
  { schema },
);

// ─────────────────────────── CSV parsing ───────────────────────────

/** Minimal RFC4180 reader — quoted fields, embedded commas and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * The export is Windows-1252, not UTF-8 (it contains a 0x96 en dash). Decode as
 * latin1 and repair the handful of cp1252 punctuation bytes that differ.
 */
function readSheet(path: string): string[][] {
  const raw = readFileSync(path).toString("latin1");
  const fixed = raw
    .replace(/[\u0091\u0092]/g, "'")
    .replace(/[\u0093\u0094]/g, '"')
    .replace(/\u0096/g, "\u2013")
    .replace(/\u0097/g, "\u2014")
    .replace(/\u0085/g, "\u2026");
  return parseCsv(fixed);
}

// ─────────────────────────── tidying ───────────────────────────

/**
 * Title-case a word only when it is shouting (ALL CAPS) or entirely lowercase.
 * Initials ("P", "V."), and already-mixed names ("McCarthy") are left alone.
 */
function tidyName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (w.length <= 1) return w;
      if (/^[A-Z]\.$/.test(w)) return w;
      // Short all-caps tokens are initials ("Tanusri SP"), not shouting.
      if (w.length <= 3 && w === w.toUpperCase() && !w.includes(".")) return w;
      const isShouting = w === w.toUpperCase() && /[A-Z]{2,}/.test(w);
      const isQuiet = w === w.toLowerCase();
      if (!isShouting && !isQuiet) return w;
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Capitalise the stray lowercase "president"/"lead"; leave acronyms alone. */
function tidyRole(role: string): string {
  return role
    .trim()
    .replace(/\bpresident\b/g, "President")
    .replace(/\blead\b/g, "Lead")
    .replace(/\s+/g, " ");
}

/** Collapse the free-text programme field to something presentable. */
function tidyProgram(p: string): string {
  return p.trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// ─────────────────────────── classification ───────────────────────────

type Bucket =
  | "president"
  | "co_lead"
  | "Vice Presidents"
  | "Secretaries & Treasurers"
  | "Core Team"
  | "School Representatives"
  | "Club Presidents"
  | "skip";

function bucketOf(position: string): Bucket {
  const p = position.toLowerCase();
  if (p === "president") return "president";
  if (p === "vice president") return "Vice Presidents";
  if (p.includes("general secretary") || p.includes("treasurer"))
    return "Secretaries & Treasurers";
  if (p.startsWith("sr ")) return "School Representatives";
  // Co-leads get no section of their own: they hang off the lead whose role
  // shares their prefix ("Sports Co Lead" → "Sports Lead") and surface only
  // inside that lead's expanded card. See src/lib/council.ts.
  if (p.includes("co lead") || p.includes("co-lead")) return "co_lead";
  if (p.endsWith("lead")) return "Core Team";
  if (p.includes("club")) return "Club Presidents";
  return "skip";
}

// ─────────────────────────── the one-line quotes ───────────────────────────
// The spreadsheet has no "line" column, so these are written per position.
// Deliberately one distinct line each — a single template repeated 56 times
// reads as filler, which is worse than an empty field.

const LINES_BY_POSITION: Record<string, string | string[]> = {
  "vice president": [
    "Between the student body and the administration, someone has to carry the message both ways.",
    "The Council works best when the quiet requests get the same attention as the loud ones.",
    "Every club, every event, every complaint — it all has to land somewhere. It lands here.",
  ],
  "general secretary": [
    "Minutes, motions and follow-ups — the paperwork that stops promises from evaporating.",
    "If it was decided in a meeting, it gets written down, and then it gets done.",
  ],
  treasurer: [
    "Every rupee the Council spends should trace back to a student who benefited from it.",
    "A budget is just a plan with numbers attached — and plans should be public.",
  ],

  // Core team
  "alumni relations lead": "The people who left still have doors worth opening for the people still here.",
  "operations lead": "Everything that looks effortless on the day took a month of unglamorous planning.",
  "cultural lead": "Campus culture isn't the calendar of events. It's what happens between them.",
  "pr & media lead": "If the Council does good work and nobody hears about it, half the job is undone.",
  "sports lead": "The arena belongs to whoever shows up, not just the people already on a team.",
  "student welfare lead": "Wellbeing isn't a poster on a wall. It's whether someone picks up when you call.",
  "tech lead": "Every tool the Council runs on should be fast, open, and built by students.",
  "outreach lead": "A council that only talks to people who already talk to it isn't representing much.",
  "facilities lead": "Hostels, classrooms, mess halls — the things you only notice once they're broken.",
  "design lead": "How the Council looks is how seriously people take what it has to say.",
  "entrepreneurship lead": "Good ideas on this campus shouldn't die waiting for permission.",
  "production lead": "Sound, light and staging — the difference between an event and an experience.",

  // School representatives
  "sr soap": "Studio hours are long. Someone should be making sure they're worth it.",
  "sr soad": "Design students need space, materials and time. I'm here to argue for all three.",
  "sr sob ug": "Undergrad business is the biggest cohort here. It shouldn't be the least heard.",
  "sr sob pg": "Postgrad life runs on a different clock, and the Council should keep up with it.",
  "sr sol": "Law students read the fine print for a living. We should hold the Council to it too.",
  "sr solh": "The humanities ask the questions the rest of campus is too busy to.",
  "sr sos": "Lab access, equipment and time — the things science students actually need.",
  "sr sot": "Tech students build half of what this campus runs on. Let's back them properly.",

  // Club presidents
  "aesthetrix club president": "A club for people who notice how things look, and want to make them look better.",
  "animal welfare club president": "The campus isn't only ours. The animals on it deserve someone in their corner.",
  "communication design club president": "Every poster, every title card, every logo on campus started as a rough sketch.",
  "distortion club president": "Loud, strange and unapologetic — there should be room on campus for that.",
  "drishyakala - the film club president": "Everyone has a film in them. We hand out the camera and the deadline.",
  "finwiz club president": "Markets, models and money — demystified for anyone willing to sit down and learn.",
  "fashion design club president": "What you wear is the first thing you ever say. We take that seriously.",
  "genesis club president": "Every big thing on this campus started as somebody's half-formed idea.",
  "global sustainability club president": "Small campus habits scale. That's the entire point of starting here.",
  "ideate club president": "Bring the rough idea. We'll help you find out whether it survives contact.",
  "janspandan club president": "Service isn't a line on a CV. It's turning up when it's inconvenient.",
  "jashn club president": "Celebration takes more planning than anyone watching ever realises.",
  "just naach club president": "You don't need training to dance with us. You need to show up twice.",
  "law club president": "Moots, debates and the fine print — practice for the rooms that matter later.",
  "literature club president": "Books, arguments about books, and the people who can't stop writing.",
  "marketing director's club president": "Every product needs a story, and every story needs someone to tell it well.",
  "rotaract club president": "Service above self, run by students who'd rather do than discuss.",
  "spectrum club president": "A place to be yourself on a campus that's still learning what that takes.",
  "tantra club president": "Tradition, performance and craft — carried forward by the people who love it.",
  "tech club president": "Build things, break things, and show the campus what students can ship.",
  "utopia esports club president": "Competitive gaming deserves the same seriousness as any other sport here.",
  "interior design club president": "Space changes how people behave in it. That's a superpower worth learning.",
  "paparazzi club president": "Somebody has to be there with a lens when the moment actually happens.",
  "debate club president": "Argue well, lose gracefully, and change your mind when the evidence says so.",
  "skribble club": "Sketchbooks open, no talent threshold, no grading — just drawing together.",
  "crowdcore club": "Nothing on this campus happens without a crowd. We're the ones who gather it.",
  "humanique club": "People first — the club for anyone interested in what makes us tick.",
  "nexus club": "The connective tissue between disciplines that don't usually talk to each other.",

  // Co-leads
  "operations co lead": "Half of operations is the second pair of hands nobody sees.",
  "sports co lead": [
    "Fixtures, kit and courts — someone has to chase all three at once.",
    "Turnout is the whole game. My job is making sure people actually show up.",
  ],
  "student welfare co lead": [
    "The second name on the list, so there's always somebody free to answer.",
    "Welfare work is mostly listening. Two of us means twice the listening.",
  ],
  "tech co lead": "Two people on tech means nothing sits in a queue waiting for one of us.",
  "facilities co lead": "Walking the buildings and writing down what's broken before someone complains.",
  "entrepreneurship co lead": "Founders need a sounding board more than they need a stage.",
  "production co lead": "Backstage runs on redundancy. I'm the redundancy.",
};

/**
 * "What they do" — the long-form text on the expanded card. Written per
 * position because the sheet has no bio column; the panel can override any of
 * them per person. Roles held by more than one student rotate through variants
 * so three VPs don't read as three copies of the same paragraph.
 */
const BIO_BY_POSITION: Record<string, string | string[]> = {
  president:
    "The President chairs the Student Council and is the student body's formal representative to the administration. That means running Council meetings, setting the year's priorities, signing off on major events and budgets, and being the person the university comes to when it needs a student position on something. Most of the work is unglamorous: following up, mediating between clubs, and making sure decisions taken in a meeting actually happen.",

  "vice president": [
    "Vice Presidents share the Council's executive load with the President and step in when they can't be there. This portfolio focuses on the flow of information both ways — carrying student concerns up to the administration and bringing decisions back down in a form people can actually act on. Day to day it means sitting in on committee meetings, chasing departments for answers, and keeping the leads unblocked.",
    "Vice Presidents share the Council's executive load with the President. This portfolio leans on coordination between the clubs and the Council: making sure club calendars don't collide, that budget requests are made properly, and that a club with a genuine problem gets it in front of someone who can fix it rather than losing it in a group chat.",
    "Vice Presidents share the Council's executive load with the President. This portfolio covers the Council's own internal running — that the committees meet, that the leads have what they need, that decisions get minuted and revisited, and that a promise made in September is still being tracked in February.",
  ],

  "general secretary": [
    "The General Secretary keeps the Council's official record. Every meeting is minuted, every motion and decision is written down with who is responsible for it, and every follow-up is chased until it's closed. The role also handles the Council's formal correspondence with the university, so requests and complaints go through a documented channel rather than a personal DM.",
    "The General Secretary keeps the Council's official record — agendas out before meetings, minutes out after, and a running list of what was promised and by whom. The role also maintains the Council's documents and constitution, which means being the person who can answer 'are we actually allowed to do that?' with a reference rather than a guess.",
  ],

  treasurer: [
    "The Treasurer manages the Council's funds: reviewing budget requests from clubs and committees, tracking what has actually been spent against what was approved, and reconciling receipts. The principle behind the role is that every rupee should be traceable to a student who benefited from it, and that the accounts should be legible to anyone who asks.",
    "The Treasurer manages the Council's funds alongside their counterpart, covering event budgets and club disbursements. The job is mostly discipline: getting quotes before committing, keeping paperwork so reimbursements aren't stuck for weeks, and flagging early when a plan costs more than the money available.",
  ],

  // ── Core Team leads ──
  "alumni relations lead":
    "Alumni Relations keeps the line open between students here now and the ones who've left. That means maintaining contact with graduating batches, arranging talks and mentoring sessions, and connecting students to alumni working in fields they're trying to break into. The value of the network is entirely in whether someone actually picks up the phone, so most of the work is relationship maintenance.",
  "operations lead":
    "Operations makes events physically happen: venues booked, permissions cleared, vendors briefed, equipment moved, volunteers rostered and schedules that survive contact with reality. Anything that looks effortless on the day took weeks of unglamorous planning, and this is the desk where that planning lives.",
  "cultural lead":
    "Cultural programming covers the festivals, performances and traditions that give the campus a character beyond its timetable. The Lead plans the cultural calendar, works with the performing clubs on what they need, and tries to make sure the programme represents more than one part of the student body.",
  "pr & media lead":
    "PR & Media handles how the Council communicates — announcements, social channels, event coverage, photography and the Council's public voice. If the Council does good work and nobody hears about it, half the job is undone; equally, the role means being straight with students when something goes wrong rather than going quiet.",
  "sports lead":
    "Sports covers inter-house and inter-college fixtures, ground and equipment access, and the general question of who gets to play. The Lead schedules tournaments, works with the sports facilities on availability, and pushes for the casual player to have as much access as the people already on a team.",
  "student welfare lead":
    "Student Welfare is the first point of contact when something is wrong — hostel and mess issues, academic grievances, mental health signposting, and disputes that need someone neutral. Much of the role is confidential and unglamorous: listening properly, then making sure the concern reaches the person with the authority to act on it.",
  "tech lead":
    "Tech builds and maintains what the Council runs on: the portal, registration and ticketing, internal tooling and the data behind it. The Lead sets the technical direction, reviews what ships, and keeps the systems fast and open enough that the next student to take over can actually work on them.",
  "outreach lead":
    "Outreach is about the students the Council doesn't already hear from. The Lead runs the channels for feedback, takes the Council to parts of campus that don't come to it, and works with external partners and other institutions. A council that only talks to people who already talk to it isn't representing much.",
  "facilities lead":
    "Facilities covers the physical campus as students experience it — hostels, classrooms, mess halls, labs, transport and the things you only notice once they're broken. The Lead collects and triages complaints, escalates them to the right department, and follows up until they're actually closed rather than acknowledged.",
  "design lead":
    "Design owns how the Council looks and reads: identity, posters, decks, signage and the visual standard for events. The Lead sets that standard and produces or reviews the work against it, on the view that how an organisation presents itself changes how seriously people take what it has to say.",
  "entrepreneurship lead":
    "Entrepreneurship supports students trying to build something — connecting them to mentors, incubation support and funding routes, and running the sessions and competitions where early ideas get pressure-tested. The point of the role is that a good idea on this campus shouldn't die waiting for permission.",
  "production lead":
    "Production runs the technical side of events: sound, lighting, staging, AV and the crew who operate it. The Lead specs what an event needs, books and tests it, and runs the show on the day — the difference between an event and an experience is almost entirely here.",

  // ── Co-leads ──
  "operations co lead":
    "Works alongside the Operations Lead on the logistics behind every event — venue bookings, vendor coordination, equipment and volunteer rosters. Operations is the one portfolio where a single point of failure shows up immediately on event day, so the co-lead carries a real share of the load rather than shadowing.",
  "sports co lead": [
    "Works alongside the Sports Lead on fixtures, ground and equipment access, and running tournaments. Splits the calendar so that two events on the same weekend both have someone accountable for them.",
    "Works alongside the Sports Lead, focusing on participation — getting teams registered, chasing turnout, and making sure casual players and first-years know how to get onto a pitch in the first place.",
  ],
  "student welfare co lead": [
    "Works alongside the Student Welfare Lead as a second point of contact for students raising a problem. Having two people on the portfolio means someone is reachable, and that a student can choose who they'd rather talk to.",
    "Works alongside the Student Welfare Lead on hostel, mess and academic grievances, and on the follow-up that turns a complaint into a resolution. Most of the role is listening carefully and then being persistent on someone else's behalf.",
  ],
  "tech co lead":
    "Works alongside the Tech Lead on the Council's portal, tooling and event systems — building features, reviewing changes and keeping things running during events, so no single request sits waiting on one person's availability.",
  "facilities co lead":
    "Works alongside the Facilities Lead on hostel, classroom and campus infrastructure issues — collecting complaints, walking the buildings, and escalating problems to the right department before they become everybody's problem.",
  "entrepreneurship co lead":
    "Works alongside the Entrepreneurship Lead supporting student founders — running sessions and competitions, and connecting early-stage teams to mentors and incubation support. A lot of it is simply being a sounding board for ideas that aren't ready for a stage yet.",
  "production co lead":
    "Works alongside the Production Lead on sound, lighting, staging and AV. Backstage work runs on redundancy: the co-lead makes sure there is always a second person who knows the cue sheet and can run the desk.",

  // ── School representatives ──
  // Roles came through as codes; these read against Woxsen's school names.
  "sr soap":
    "Represents students of the School of Architecture & Planning on the Council. Studio-based programmes have their own problems — long studio hours, materials and workspace access, and juries that don't fit a normal timetable — and this seat exists so those get raised rather than averaged away.",
  "sr soad":
    "Represents students of the School of Art & Design on the Council. The role covers what design students actually need to work — studio space, materials, equipment access and time — and carries school-specific academic concerns to the Council and the administration.",
  "sr sob ug":
    "Represents undergraduate students of the School of Business on the Council. It's the largest cohort on campus, which makes it easy for individual concerns to get lost in the average; this seat exists to bring specific ones forward, from scheduling to placements and academic policy.",
  "sr sob pg":
    "Represents postgraduate students of the School of Business on the Council. Postgraduate life runs on a different clock — shorter programmes, heavier coursework, different placement timelines — and this seat makes sure Council decisions account for that rather than assuming an undergraduate calendar.",
  "sr sol":
    "Represents students of the School of Law on the Council. The role covers moot and competition support, library and research access, and school-specific academic concerns — and law students tend to hold the Council to its own rules, which is no bad thing.",
  "sr solh":
    "Represents students of the School of Liberal Arts & Humanities on the Council. It's a smaller cohort with a distinct academic rhythm, and the seat makes sure their teaching, space and event needs aren't overlooked in favour of the larger schools.",
  "sr sos":
    "Represents students of the School of Sciences on the Council. Lab access, equipment, safety and scheduling around practical hours are the recurring issues, and this seat brings them to the Council with the specifics attached.",
  "sr sot":
    "Represents students of the School of Technology on the Council. The role covers lab and hardware access, project support, and the academic concerns of a cohort that builds a large share of what the campus runs on.",

  // ── Club presidents ──
  "aesthetrix club president":
    "Leads Aesthetrix, the club for students interested in visual aesthetics and the craft behind them. The President plans the club's calendar, runs sessions and workshops, and manages its members and budget — and is accountable to the Council for both.",
  "animal welfare club president":
    "Leads the Animal Welfare Club, which looks after the animals living on and around campus — feeding, vaccination and rescue drives, and the awareness work that stops these becoming one person's private responsibility.",
  "communication design club president":
    "Leads the Communication Design Club. The club produces a large share of the campus's visual output — posters, titles, identities — and runs the workshops where students learn to make it. The President sets the calendar and manages members and budget.",
  "distortion club president":
    "Leads Distortion, the club for music and sound on the louder end of the spectrum. The President programmes the club's gigs and sessions, coordinates with Production on technical needs, and manages members and budget.",
  "drishyakala - the film club president":
    "Leads DrishyaKala, the campus film club — screenings, film-making workshops, and the short-film projects that give students a camera and a deadline. The President runs the programme and manages the club's members and budget.",
  "finwiz club president":
    "Leads FinWiz, the finance club. Markets, valuation, personal finance and the competitions that go with them, pitched at anyone willing to sit down and learn rather than only at finance majors. The President runs the sessions and manages members and budget.",
  "fashion design club president":
    "Leads the Fashion Design Club — showcases, styling and construction workshops, and the collaborative work behind a campus show. The President plans the calendar and manages the club's members and budget.",
  "genesis club president":
    "Leads Genesis, the club for students with an idea and no obvious place to take it. The President runs the sessions where those ideas get built out and tested, and manages the club's members and budget.",
  "global sustainability club president":
    "Leads the Global Sustainability Club, which runs the campus's environmental initiatives — waste, energy and consumption habits, plus the awareness work behind them. The President sets the agenda and manages members and budget.",
  "ideate club president":
    "Leads Ideate, a club built around structured idea generation and problem-solving — design sprints, hackathon-style sessions and workshops. The President runs the programme and manages the club's members and budget.",
  "janspandan club president":
    "Leads JanSpandan, the club's community service arm. Outreach and volunteering programmes with communities around the campus, run on the basis that service is about turning up when it's inconvenient. The President coordinates the drives and manages members and budget.",
  "jashn club president":
    "Leads Jashn, the club behind the campus's celebrations and festival programming. Far more planning goes into these than anyone watching realises, and the President owns that planning along with the club's members and budget.",
  "just naach club president":
    "Leads Just Naach, the dance club — practices, choreography and performances across the year, open to trained dancers and complete beginners alike. The President runs the calendar and manages members and budget.",
  "law club president":
    "Leads the Law Club — moots, debates, legal awareness sessions and competition preparation. The President runs the programme, coordinates with the School of Law, and manages the club's members and budget.",
  "literature club president":
    "Leads the Literature Club: reading circles, writing workshops, open mics and the campus's publishing efforts. The President runs the calendar and manages the club's members and budget.",
  "marketing director's club president":
    "Leads the Marketing Director's Club — case competitions, campaign work and sessions on how products actually get sold. The President runs the programme and manages the club's members and budget.",
  "rotaract club president":
    "Leads the Rotaract Club, the campus chapter of the international service organisation. Community projects, professional development and joint work with other chapters. The President runs the programme and manages members and budget.",
  "spectrum club president":
    "Leads Spectrum, the club that exists so students have a place to be themselves on a campus still learning what that takes. The President runs its sessions and awareness work and manages the club's members and budget.",
  "tantra club president":
    "Leads Tantra, the club for traditional performance and craft — carrying those forms forward through performances and workshops. The President plans the calendar and manages the club's members and budget.",
  "tech club president":
    "Leads the Tech Club — build sessions, hackathons and workshops, plus the projects that get shipped and shown to the rest of campus. The President runs the programme and manages members and budget.",
  "utopia esports club president":
    "Leads Utopia Esports, which runs the campus's competitive gaming scene — tournaments, team selection and inter-college fixtures, treated with the same seriousness as any other sport. The President runs it and manages members and budget.",
  "interior design club president":
    "Leads the Interior Design Club — workshops and projects on how space changes the way people behave in it. The President plans the calendar and manages the club's members and budget.",
  "paparazzi club president":
    "Leads Paparazzi, the campus photography club. It covers events, runs technique workshops, and maintains the visual record of the year. The President coordinates coverage and manages members and budget.",
  "debate club president":
    "Leads the Debate Club — parliamentary debate, public speaking training and inter-college competition. The President runs the practice schedule, selects teams, and manages the club's members and budget.",
  "skribble club":
    "Leads Skribble, the campus sketching club — open drawing sessions with no talent threshold and no grading. The President runs the sessions and manages the club's members and budget.",
  "crowdcore club":
    "Leads Crowdcore, the club responsible for turnout and crowd energy at campus events. Nothing on this campus happens without a crowd, and this is the club that gathers one. The President runs it and manages members and budget.",
  "humanique club":
    "Leads Humanique, a club built around people — psychology, behaviour and the conversations in between. The President runs the sessions and manages the club's members and budget.",
  "nexus club":
    "Leads Nexus, the club that works across disciplines that don't usually talk to each other, running collaborative projects and cross-school events. The President runs the programme and manages members and budget.",
};

/** Pick the entry for a position, rotating through variants for shared roles. */
function pick(
  table: Record<string, string | string[]>,
  position: string,
  seen: Map<string, number>,
): string | null {
  const key = position.toLowerCase().trim();
  const entry = table[key];
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  const n = seen.get(key) ?? 0;
  seen.set(key, n + 1);
  return entry[Math.min(n, entry.length - 1)];
}

// ─────────────────────────── main ───────────────────────────

type Incoming = {
  name: string;
  email: string;
  program: string;
  role: string;
  bucket: Bucket;
  quote: string | null;
  bio: string | null;
};

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes("--dry");
  if (!file) {
    console.error('Usage: tsx scripts/import-council-csv.ts "<file.csv>" [--dry]');
    process.exit(1);
  }

  const rows = readSheet(file).filter((r) => r.some((c) => c.trim()));
  const body = rows.slice(1).filter((r) => r[0]?.trim());

  // Separate counters: quotes and bios rotate through their variants independently.
  const seenForLines = new Map<string, number>();
  const seenForBios = new Map<string, number>();
  const incoming: Incoming[] = [];
  let skipped = 0;

  for (const r of body) {
    const [name, email, , , program, position] = r.map((c) => (c ?? "").trim());
    if (!name || !position) continue;
    const bucket = bucketOf(position);
    if (bucket === "skip") {
      skipped++;
      continue;
    }
    incoming.push({
      name: tidyName(name),
      email: email.toLowerCase(),
      program: tidyProgram(program),
      role: tidyRole(position),
      bucket,
      quote: pick(LINES_BY_POSITION, position, seenForLines),
      bio: pick(BIO_BY_POSITION, position, seenForBios),
    });
  }

  // Resolve group ids by title so the script doesn't depend on seeded ids.
  const groups = await db.select().from(councilGroups);
  const groupId = new Map(groups.map((g) => [g.title, g.id]));
  const missing = [...new Set(incoming.map((i) => i.bucket))].filter(
    (b) => b !== "president" && b !== "co_lead" && !groupId.has(b),
  );
  if (missing.length) {
    console.error("Missing council sections:", missing.join(", "));
    console.error("Run `npm run db:migrate` first.");
    process.exit(1);
  }

  const existing = await db.select().from(councilMembers);
  const byEmail = new Map(
    existing.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]),
  );
  const byName = new Map(existing.map((m) => [normName(m.name), m]));

  const claimed = new Set<number>();

  /**
   * Find the existing row for an incoming person. Exact email wins, then exact
   * name. Failing that, a containment match catches the same person recorded
   * under a shorter or longer form of their name ("Tanusri" ↔ "Tanusri SP",
   * "Inayat Ali Khan" ↔ "Mir Inayat Ali Khan") — but only when it is
   * unambiguous, so two different Sharanyas can never collapse into one row.
   * The sitting president is matched by role as a last resort.
   */
  function findExisting(m: Incoming, isPresident: boolean) {
    const exact =
      (m.email && byEmail.get(m.email)) || byName.get(normName(m.name));
    if (exact) return exact;

    const n = normName(m.name);
    const near = existing.filter((e) => {
      if (claimed.has(e.id)) return false;
      const en = normName(e.name);
      if (en.length < 6 || n.length < 6) return false;
      return en.includes(n) || n.includes(en);
    });
    if (near.length === 1) return near[0];

    if (isPresident) {
      const sitting = existing.filter(
        (e) => e.memberType === "president" && !claimed.has(e.id),
      );
      if (sitting.length === 1) return sitting[0];
    }
    return null;
  }

  const perGroupOrder = new Map<string, number>();
  let created = 0;
  let updated = 0;

  for (const m of incoming) {
    const isPresident = m.bucket === "president";
    const isCoLead = m.bucket === "co_lead";
    const match = findExisting(m, isPresident);
    if (match) claimed.add(match.id);
    // Neither the president nor a co-lead belongs to a section: the president
    // gets the takeover, and a co-lead renders inside their lead's card.
    const gid = isPresident || isCoLead ? null : groupId.get(m.bucket)!;
    const memberType = isPresident
      ? "president"
      : isCoLead
        ? "co_lead"
        : "member";
    const orderKey = m.bucket;
    const order = (perGroupOrder.get(orderKey) ?? 0) + 1;
    perGroupOrder.set(orderKey, order);

    if (match) {
      // Never clobber a portrait, a president's message, a hand-written bio, or
      // an address deliberately set to a role inbox rather than a personal one.
      const patch: Record<string, unknown> = {
        name: m.name,
        role: m.role,
        program: m.program,
        memberType,
        isPresident,
        groupId: gid,
        sortOrder: order,
        updatedAt: new Date().toISOString(),
      };
      if (!match.email && m.email) patch.email = m.email;
      if (!match.quote && m.quote) patch.quote = m.quote;
      if (!match.bio && m.bio) patch.bio = m.bio;

      if (!dry) {
        await db
          .update(councilMembers)
          .set(patch)
          .where(eq(councilMembers.id, match.id));
      }
      updated++;
      console.log(`  ~ ${m.name} — ${m.role}`);
    } else {
      if (!dry) {
        await db.insert(councilMembers).values({
          name: m.name,
          role: m.role,
          program: m.program,
          email: m.email || null,
          quote: m.quote,
          bio: m.bio,
          memberType,
          isPresident,
          groupId: gid,
          sortOrder: order,
        });
      }
      created++;
      console.log(`  + ${m.name} — ${m.role}`);
    }
  }

  // One president only, mirroring the panel's own rule.
  if (!dry) {
    const pres = await db.query.councilMembers.findFirst({
      where: eq(councilMembers.memberType, "president"),
    });
    if (pres) {
      await db
        .update(councilMembers)
        .set({ memberType: "member", isPresident: false })
        .where(
          and(
            sql`${councilMembers.id} <> ${pres.id}`,
            eq(councilMembers.memberType, "president"),
          ),
        );
      await db
        .update(councilMembers)
        .set({ groupId: null })
        .where(
          and(eq(councilMembers.id, pres.id), isNull(councilMembers.groupId)),
        );
    }
  }

  const coLeads = incoming.filter((m) => m.bucket === "co_lead").length;
  console.log(
    `\n${dry ? "[dry run] " : ""}created ${created}, updated ${updated}` +
      ` (${coLeads} co-leads), skipped ${skipped} unrecognised.`,
  );

  // A co-lead whose lead is missing renders nowhere, so say so rather than
  // letting them vanish silently.
  const orphaned = incoming.filter(
    (m) =>
      m.bucket === "co_lead" &&
      !incoming.some(
        (l) => l.bucket !== "co_lead" && leadBase(l.role) === coLeadBase(m.role),
      ),
  );
  if (orphaned.length) {
    console.log(
      `\n⚠ ${orphaned.length} co-lead(s) have no matching Lead and will not appear on /council:`,
    );
    for (const o of orphaned) console.log(`    ${o.name} — ${o.role}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
