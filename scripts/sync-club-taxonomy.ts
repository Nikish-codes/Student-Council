import { config } from "dotenv";
import { createClient, type Client, type Transaction } from "@libsql/client";

config({ path: ".env.local", quiet: true });

type CategorySpec = {
  slug: string;
  label: string;
  blurb: string;
  sortOrder: number;
};

type ClubSpec = {
  slug: string;
  name: string;
  category: string;
  blurb: string;
  tags: string[];
};

const CATEGORIES: CategorySpec[] = [
  {
    slug: "design-visual-arts",
    label: "Design & Visual Arts",
    blurb:
      "Architecture, graphic design, photography, fashion and product design.",
    sortOrder: 10,
  },
  {
    slug: "performing-arts-entertainment",
    label: "Performing Arts & Entertainment",
    blurb: "Dance, music, film, cultural performance and competitive gaming.",
    sortOrder: 20,
  },
  {
    slug: "career-development-professional-excellence",
    label: "Career Development & Professional Excellence",
    blurb:
      "Business skills, finance, marketing, operations, technology and HR.",
    sortOrder: 30,
  },
  {
    slug: "social-responsibility-community-engagement",
    label: "Social Responsibility & Community Engagement",
    blurb:
      "Social impact, environmental sustainability, civic engagement and animal welfare.",
    sortOrder: 40,
  },
  {
    slug: "intellectual-growth-academic-excellence",
    label: "Intellectual Growth & Academic Excellence",
    blurb: "Debate, law, literature, science, languages and psychology.",
    sortOrder: 50,
  },
];

const CLUBS: ClubSpec[] = [
  {
    slug: "aesthetrix",
    name: "Aesthetrix (Architecture Club)",
    category: "design-visual-arts",
    blurb:
      "Provides a creative community space for interaction and exchange of design ideas beyond just architecture students.",
    tags: ["Architecture", "Design"],
  },
  {
    slug: "communication-design",
    name: "CD (Communication Design) Club",
    category: "design-visual-arts",
    blurb:
      "Bridges academic learning and practical application in design, encouraging experimentation and growth.",
    tags: ["Communication Design", "Graphic Design"],
  },
  {
    slug: "ideate",
    name: "Ideate",
    category: "design-visual-arts",
    blurb:
      "Provides a structured, hands-on platform for industrial design focused on execution and interdisciplinary collaboration.",
    tags: ["Product Design", "Industrial Design"],
  },
  {
    slug: "interior-design",
    name: "Interior Design Club",
    category: "design-visual-arts",
    blurb:
      "Builds a creative, collaborative community for exploring design, spatial aesthetics and storytelling.",
    tags: ["Interior Design", "Spatial Design"],
  },
  {
    slug: "paparazzi",
    name: "Paparazzi (Photography Club)",
    category: "design-visual-arts",
    blurb:
      "Creates opportunities for students to express creativity through visual storytelling and the visual archiving of campus life.",
    tags: ["Photography", "Visual Storytelling"],
  },
  {
    slug: "skribble",
    name: "Skribble Club",
    category: "design-visual-arts",
    blurb:
      "Aspires to be the creative heartbeat of the university through art, design and imagination.",
    tags: ["Art", "Design"],
  },
  {
    slug: "fashion-design",
    name: "WFC (Woxsen Fashion Club)",
    category: "design-visual-arts",
    blurb:
      "Provides a collaborative platform for fashion through styling, modelling, garment construction and editorial production.",
    tags: ["Fashion", "Styling"],
  },
  {
    slug: "just-naach",
    name: "Just Naach (Dance Club)",
    category: "performing-arts-entertainment",
    blurb:
      "Builds a thriving, inclusive dance community and promotes diverse dance forms across campus.",
    tags: ["Dance", "Performance"],
  },
  {
    slug: "distortion",
    name: "Distortion (Music Club)",
    category: "performing-arts-entertainment",
    blurb:
      "Champions musical talent and fosters creative growth through high standards of performance and quality.",
    tags: ["Music", "Performance"],
  },
  {
    slug: "drishyakala",
    name: "Film Club (Drishyakala)",
    category: "performing-arts-entertainment",
    blurb:
      "Reconnects people with a genuine love for cinema through acting, directing, writing and editing.",
    tags: ["Film", "Cinema"],
  },
  {
    slug: "jashn",
    name: "Jashn (Cultural Club)",
    category: "performing-arts-entertainment",
    blurb:
      "Promotes and celebrates cultural diversity through authentic traditions and radical inclusivity on campus.",
    tags: ["Culture", "Performance"],
  },
  {
    slug: "utopia",
    name: "Utopia (Esports Club)",
    category: "performing-arts-entertainment",
    blurb:
      "Empowers students to compete and grow through a supportive and inclusive esports ecosystem.",
    tags: ["Esports", "Gaming"],
  },
  {
    slug: "finwiz",
    name: "FinWiz (Finance Club)",
    category: "career-development-professional-excellence",
    blurb:
      "Redefines finance education through consistency, industry exposure and practical student engagement.",
    tags: ["Finance", "Business"],
  },
  {
    slug: "crowdcore",
    name: "CrowdCore Club",
    category: "career-development-professional-excellence",
    blurb:
      "Focuses on marketing, branding, outreach, content creation and community building.",
    tags: ["Marketing", "Branding"],
  },
  {
    slug: "humanique",
    name: "Humanique (HR Club)",
    category: "career-development-professional-excellence",
    blurb:
      "Focuses on professional growth, workplace readiness, leadership development and social responsibility.",
    tags: ["HR", "Professional Development"],
  },
  {
    slug: "mdc",
    name: "Marketing Director's Club (MDC)",
    category: "career-development-professional-excellence",
    blurb:
      "Supports students in developing professional skills, industry knowledge and connections for future marketing success.",
    tags: ["Marketing", "Professional Development"],
  },
  {
    slug: "tantra",
    name: "Tantra (Operations Club)",
    category: "career-development-professional-excellence",
    blurb:
      "Promotes operations as a professional discipline through reliability and real-world simulations.",
    tags: ["Operations", "Business"],
  },
  {
    slug: "technology-club",
    name: "Technology Club",
    category: "career-development-professional-excellence",
    blurb:
      "Redefines tech fests as immersive, interdisciplinary experiences where technology meets culture.",
    tags: ["Technology", "Engineering"],
  },
  {
    slug: "awc",
    name: "Animal Welfare Club (AWC)",
    category: "social-responsibility-community-engagement",
    blurb:
      "Creates a compassionate campus environment for animals, focusing on care, dignity and awareness.",
    tags: ["Animal Welfare", "Social Impact"],
  },
  {
    slug: "janspandan",
    name: "JanSpandan (Political Science Club)",
    category: "social-responsibility-community-engagement",
    blurb:
      "Transforms political learning from theory into experiential governance simulations.",
    tags: ["Political Science", "Civic Engagement"],
  },
  {
    slug: "rotaract",
    name: "Rotaract Club",
    category: "social-responsibility-community-engagement",
    blurb:
      "An impact-driven club focused on social service, women-focused initiatives and grassroots community engagement.",
    tags: ["Community Service", "Social Impact"],
  },
  {
    slug: "sustainability",
    name: "Sustainability Club",
    category: "social-responsibility-community-engagement",
    blurb:
      "Promotes a culture of action-oriented sustainability through real-world impact and community engagement.",
    tags: ["Sustainability", "Environment"],
  },
  {
    slug: "genesis",
    name: "Club Genesis",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "Creates a space for understanding self and connecting with others through practical psychology and communication.",
    tags: ["Psychology", "Communication"],
  },
  {
    slug: "nexus",
    name: "Nexus Club",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "A multicultural language and linguistics platform focused on inclusivity and social awareness through storytelling.",
    tags: ["Languages", "Linguistics"],
  },
  {
    slug: "spectrum",
    name: "Spectrum (Science Club)",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "Increases science awareness through curiosity, scientific activities and practical experimentation.",
    tags: ["Science", "Research"],
  },
  {
    slug: "law-club",
    name: "The Law Club",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "Makes legal thinking accessible and applied while bridging the gap between law and other disciplines.",
    tags: ["Law", "Debate"],
  },
  {
    slug: "literature",
    name: "The Literature Club",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "Encourages engagement with literature beyond reading through discussion, analysis and creative activities.",
    tags: ["Literature", "Writing"],
  },
  {
    slug: "wdc",
    name: "Woxsen Debate Club (WDC)",
    category: "intellectual-growth-academic-excellence",
    blurb:
      "Promotes debate as a vital life skill for critical thinking, communication and intellectual engagement.",
    tags: ["Debate", "Public Speaking"],
  },
];

type ClubRow = { id: number; slug: string; name: string };
type CategoryRow = { id: number; slug: string; label: string };

function countValue(value: unknown): number {
  return Number(value ?? 0);
}

async function assertExtrasAreUnreferenced(client: Client, extras: ClubRow[]) {
  for (const club of extras) {
    const [events, users] = await Promise.all([
      client.execute({
        sql: "select count(*) as count from mp_events where club_id = ?",
        args: [club.id],
      }),
      client.execute({
        sql: "select count(*) as count from mp_users where club_id = ?",
        args: [club.id],
      }),
    ]);
    const eventCount = countValue(events.rows[0]?.count);
    const userCount = countValue(users.rows[0]?.count);
    if (eventCount || userCount) {
      throw new Error(
        `Cannot remove ${club.name}: ${eventCount} linked event(s), ${userCount} linked user(s).`,
      );
    }
  }
}

async function upsertCategories(tx: Transaction, now: string) {
  for (const category of CATEGORIES) {
    await tx.execute({
      sql: `insert into mp_club_categories
              (slug, label, blurb, sort_order, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?)
            on conflict(slug) do update set
              label = excluded.label,
              blurb = excluded.blurb,
              sort_order = excluded.sort_order,
              updated_at = excluded.updated_at`,
      args: [
        category.slug,
        category.label,
        category.blurb,
        category.sortOrder,
        now,
        now,
      ],
    });
  }
}

async function categoryIds(tx: Transaction) {
  const rows = await tx.execute(
    "select id, slug, label from mp_club_categories",
  );
  return new Map(
    (rows.rows as unknown as CategoryRow[]).map((row) => [row.slug, row.id]),
  );
}

async function upsertClubs(
  tx: Transaction,
  ids: Map<string, number>,
  now: string,
) {
  for (const club of CLUBS) {
    const categoryId = ids.get(club.category);
    if (!categoryId) throw new Error(`Missing category: ${club.category}`);
    await tx.execute({
      sql: `insert into mp_clubs
              (slug, name, blurb, tags, category_id, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)
            on conflict(slug) do update set
              name = excluded.name,
              blurb = excluded.blurb,
              tags = excluded.tags,
              category_id = excluded.category_id,
              updated_at = excluded.updated_at`,
      args: [
        club.slug,
        club.name,
        club.blurb,
        JSON.stringify(club.tags),
        categoryId,
        now,
        now,
      ],
    });
  }
}

async function removeExtrasFromHomepage(tx: Transaction, extras: ClubRow[]) {
  if (!extras.length) return;
  const row = await tx.execute(
    "select featured_club_ids from mp_homepage_config where id = 1",
  );
  const raw = row.rows[0]?.featured_club_ids;
  const featured = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(featured)) return;
  const extraIds = new Set(extras.map((club) => club.id));
  const filtered = featured.filter((id) => !extraIds.has(Number(id)));
  if (filtered.length !== featured.length) {
    await tx.execute({
      sql: "update mp_homepage_config set featured_club_ids = ?, updated_at = ? where id = 1",
      args: [JSON.stringify(filtered), new Date().toISOString()],
    });
  }
}

async function verify(client: Client) {
  const [total, grouped, categories] = await Promise.all([
    client.execute("select count(*) as count from mp_clubs"),
    client.execute(`select cc.label, cc.sort_order, count(c.id) as count
                      from mp_club_categories cc
                      left join mp_clubs c on c.category_id = cc.id
                     group by cc.id
                     order by cc.sort_order, cc.id`),
    client.execute("select count(*) as count from mp_club_categories"),
  ]);

  const clubCount = countValue(total.rows[0]?.count);
  const categoryCount = countValue(categories.rows[0]?.count);
  const counts = grouped.rows.map((row) => ({
    category: String(row.label),
    clubs: countValue(row.count),
  }));

  if (clubCount !== 28 || categoryCount !== 5) {
    throw new Error(
      `Verification failed: expected 28 clubs/5 categories, found ${clubCount}/${categoryCount}.`,
    );
  }
  console.log(JSON.stringify({ clubCount, categoryCount, counts }, null, 2));
}

async function main() {
  if (
    CLUBS.length !== 28 ||
    new Set(CLUBS.map((club) => club.slug)).size !== 28
  ) {
    throw new Error("Taxonomy must contain exactly 28 unique clubs.");
  }

  const client = createClient({
    url: process.env.LIBSQL_URL || "file:./payload.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });

  try {
    const [clubResult, categoryResult] = await Promise.all([
      client.execute("select id, slug, name from mp_clubs order by name"),
      client.execute(
        "select id, slug, label from mp_club_categories order by sort_order, id",
      ),
    ]);
    const currentClubs = clubResult.rows as unknown as ClubRow[];
    const currentCategories = categoryResult.rows as unknown as CategoryRow[];
    const desiredClubSlugs = new Set(CLUBS.map((club) => club.slug));
    const desiredCategorySlugs = new Set(
      CATEGORIES.map((category) => category.slug),
    );
    const extras = currentClubs.filter(
      (club) => !desiredClubSlugs.has(club.slug),
    );
    const missing = CLUBS.filter(
      (club) => !currentClubs.some((row) => row.slug === club.slug),
    );
    const obsoleteCategories = currentCategories.filter(
      (category) => !desiredCategorySlugs.has(category.slug),
    );

    console.log(
      JSON.stringify(
        {
          mode: process.argv.includes("--apply") ? "apply" : "dry-run",
          currentClubs: currentClubs.length,
          targetClubs: CLUBS.length,
          add: missing.map((club) => club.name),
          remove: extras.map((club) => club.name),
          replaceCategories: obsoleteCategories.map(
            (category) => category.label,
          ),
        },
        null,
        2,
      ),
    );

    await assertExtrasAreUnreferenced(client, extras);
    if (!process.argv.includes("--apply")) return;

    const now = new Date().toISOString();
    const tx = await client.transaction("write");
    try {
      await upsertCategories(tx, now);
      const ids = await categoryIds(tx);
      await upsertClubs(tx, ids, now);
      await removeExtrasFromHomepage(tx, extras);
      for (const club of extras) {
        await tx.execute({
          sql: "delete from mp_clubs where id = ?",
          args: [club.id],
        });
      }
      for (const category of obsoleteCategories) {
        await tx.execute({
          sql: "delete from mp_club_categories where id = ?",
          args: [category.id],
        });
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }

    await verify(client);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
