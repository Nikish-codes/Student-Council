"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ClubGalleryItem } from "@/db/schema";
import { requireStudioClub } from "@/lib/club-studio";
import { saveRevisionDraft, submitRevision } from "@/lib/revisions";

const s = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const nullable = (value: string) => value || null;
const number = (value: string) => value ? Number(value) : null;
const json = <T,>(value: string, fallback: T): T => {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};

export async function saveClubPageRevision(formData: FormData) {
  const active = await requireStudioClub(s(formData, "clubId"));
  if (!active.canEditPage && active.membershipRole !== "president") throw new Error("FORBIDDEN");
  const visible = ["about", "activities", "videos", "events", "gallery", "people"]
    .filter((section) => formData.get(`section_${section}`) === "on");
  const activities = s(formData, "activities")
    .split("\n")
    .map((row) => row.split("|").map((part) => part.trim()))
    .filter(([title]) => title)
    .map(([title, description]) => ({ title, description: description || undefined }));
  const videos = s(formData, "videos")
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ url }));
  const snapshot = {
    name: s(formData, "name"),
    blurb: s(formData, "blurb"),
    tagline: nullable(s(formData, "tagline")),
    about: nullable(s(formData, "about")),
    logoId: number(s(formData, "logoId")),
    coverId: number(s(formData, "coverId")),
    joinUrl: nullable(s(formData, "joinUrl")),
    members: number(s(formData, "members")),
    foundedYear: number(s(formData, "foundedYear")),
    flagshipEvent: nullable(s(formData, "flagshipEvent")),
    activities,
    videos,
    gallery: json<ClubGalleryItem[]>(s(formData, "gallery"), []),
    instagramUrl: nullable(s(formData, "instagramUrl")),
    linkedinUrl: nullable(s(formData, "linkedinUrl")),
    websiteUrl: nullable(s(formData, "websiteUrl")),
    contactEmail: nullable(s(formData, "contactEmail")),
    pageTemplate: s(formData, "pageTemplate"),
    pageTheme: {
      background: s(formData, "themeBackground"),
      foreground: s(formData, "themeForeground"),
      accent: s(formData, "themeAccent"),
      logoTreatment: s(formData, "logoTreatment"),
    },
    pageVisibleSections: visible,
    pageSectionHeadings: {
      about: s(formData, "headingAbout") || "About us",
      activities: s(formData, "headingActivities") || "What we do",
      events: s(formData, "headingEvents") || "Events",
      gallery: s(formData, "headingGallery") || "Gallery",
      people: s(formData, "headingPeople") || "Our people",
      videos: s(formData, "headingVideos") || "Watch",
    },
    pageTypography: s(formData, "pageTypography"),
  };
  const revisionId = await saveRevisionDraft({
    revisionId: nullable(s(formData, "revisionId")) ?? undefined,
    entityType: "club_page",
    entityId: active.clubId,
    clubId: active.clubId,
    baseVersion: Number(s(formData, "baseVersion")),
    snapshot,
  });
  if (s(formData, "intent") === "submit") await submitRevision(revisionId);
  revalidatePath("/club-management");
  revalidatePath("/club-management/page-editor");
  redirect(`/club-management/page-editor?club=${active.clubId}&revision=${revisionId}&saved=1`);
}
