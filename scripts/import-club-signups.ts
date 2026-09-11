/**
 * Import the registration links supplied on 11 September 2026.
 * Run once with: node --import tsx scripts/import-club-signups.ts
 * Future edits belong in Management → Clubs → Registration link.
 */
import { config } from "dotenv";
import { createClient } from "@libsql/client";
config({ path: ".env.local", quiet: true });

const links: Record<string, string> = {
  "technology-club": "https://forms.cloud.microsoft/r/waFGtXFNVu",
  try: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3X0lO7ygDZE5Bh5ygoD0Qj71URU1INk5YNUFWUVJWUjlaTVQ1WFkxSlRJNy4u",
  paparazzi: "https://forms.cloud.microsoft/r/mdcqV78e2n",
  skribble: "https://forms.cloud.microsoft/r/gNHJ0HHYiW",
  "fashion-design": "https://forms.cloud.microsoft/r/LbnN8CaSdX",
  finwiz:
    "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=LSD36rPvekOhA1Bbufv3X3ZRbSg6bF9HuzdZM1zFkDFUMjVBOElKOTZUUlI0NkZERTc1RlVQN05ZSi4u",
  aesthetrix: "https://forms.cloud.microsoft/r/4R2e79QW7U",
  janspandan: "https://forms.cloud.microsoft/r/ZpJkH83UrQ",
};

async function main() {
  if (!process.env.LIBSQL_URL) throw new Error("LIBSQL_URL is required.");
  const client = createClient({
    url: process.env.LIBSQL_URL,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });
  const tx = await client.transaction("write");
  try {
    for (const [slug, name, blurb, linkedin, category, tags] of [
      [
        "try",
        "Try Club",
        "Explore rural entrepreneurship with Try Club.",
        "https://www.linkedin.com/company/try-rural-entrepreneurship/",
        "career-development-professional-excellence",
        '["Entrepreneurship","Rural development"]',
      ],
      [
        "street-cause",
        "Street Cause",
        "Get involved in community service with Street Cause.",
        "https://www.linkedin.com/in/street-cause-woxsen2324/",
        "social-responsibility-community-engagement",
        '["Volunteering","Community service"]',
      ],
    ]) {
      await tx.execute({
        sql: "INSERT INTO mp_clubs (slug,name,blurb,linkedin_url,category_id,tags) SELECT ?,?,?,?,(SELECT id FROM mp_club_categories WHERE slug=?),? WHERE NOT EXISTS (SELECT 1 FROM mp_clubs WHERE slug=? OR lower(name)=lower(?))",
        args: [slug, name, blurb, linkedin, category, tags, slug, name],
      });
    }
    for (const [slug, url] of Object.entries(links)) {
      const row = await tx.execute({
        sql: "SELECT id FROM mp_clubs WHERE slug=?",
        args: [slug],
      });
      if (row.rows.length !== 1)
        throw new Error("Expected exactly one club: " + slug);
      await tx.execute({
        sql: "UPDATE mp_clubs SET join_url=?, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE slug=? AND (join_url IS NULL OR join_url<>?)",
        args: [url, slug, url],
      });
    }
    await tx.commit();
    const totals = await client.execute(
      "SELECT count(*) AS clubs FROM mp_clubs",
    );
    console.log(
      "Imported 8 registration links. Club count:",
      totals.rows[0].clubs,
    );
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
    client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
