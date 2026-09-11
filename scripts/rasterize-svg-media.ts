/**
 * Rasterize SVG logos in the media library to PNG. next/image serves SVGs as
 * unoptimized raw <img>, bypassing the optimizer + edge cache pipeline;
 * treating them like every other raster asset keeps behavior consistent.
 *
 *   npm run media:rasterize-svgs [--dry-run]
 *
 * For each mp_media row whose mimeType is an SVG: downloads the object,
 * rasterizes it to PNG via sharp at high density, uploads alongside, and
 * rewrites the row in place (url, filename, mimeType, dimensions). The
 * original .svg object stays in the bucket untouched.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";
import { media as mediaT } from "../src/db/schema";

const MEDIA_PREFIX = "media";

function publicR2Url(key: string) {
  return `${(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "")}/${MEDIA_PREFIX}/${key}`;
}

// Mirrors makeKey from src/lib/r2 (kept inline because r2.ts is server-only).
const makeKey = (filename: string) => {
  const clean = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return `${crypto.randomUUID()}-${clean || "file"}`;
};

async function r2Put(key: string, body: Buffer, contentType: string) {
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET || "",
      Key: `${MEDIA_PREFIX}/${key}`,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicR2Url(key);
}

const raw = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
const db = drizzle(raw, { schema });

const DRY = process.argv.includes("--dry-run");
const TARGET_WIDTH = 512;

async function main() {
  const rows = await db.select().from(mediaT);
  const svgs = rows.filter(
    (row) =>
      (row.mimeType ?? "").startsWith("image/svg") ||
      (row.url ?? "").toLowerCase().endsWith(".svg"),
  );
  console.log(`Found ${svgs.length} SVG media row(s).`);
  for (const row of svgs) {
    const source = await fetch(row.url!);
    if (!source.ok) {
      console.log(`! ${row.id} fetch failed (${source.status}): ${row.url}`);
      continue;
    }
    const svgBuffer = Buffer.from(await source.arrayBuffer());
    const natural = await sharp(svgBuffer, { density: 300 }).metadata();
    const png = await sharp(svgBuffer, { density: 300 })
      .resize({ width: Math.min(TARGET_WIDTH, (natural.width ?? TARGET_WIDTH) * 2 || TARGET_WIDTH), withoutEnlargement: false })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    if (DRY) {
      console.log(
        `= ${row.id} ${row.filename} → would rasterize to ${meta.width}x${meta.height} PNG`,
      );
      continue;
    }
    const filename = ((row.filename ?? "logo.svg").replace(/\.svg$/i, "") + ".png").toLowerCase();
    const key = makeKey(filename);
    const url = await r2Put(key, png, "image/png");
    await db
      .update(mediaT)
      .set({
        url,
        filename,
        mimeType: "image/png",
        width: meta.width ?? null,
        height: meta.height ?? null,
        filesize: png.byteLength,
      })
      .where(eq(mediaT.id, row.id));
    console.log(
      `✓ ${row.id} ${row.filename} → PNG ${meta.width}x${meta.height} (${Math.round(png.byteLength / 1024)} KB): ${url}`,
    );
  }
  console.log(DRY ? "Dry run complete." : "Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
