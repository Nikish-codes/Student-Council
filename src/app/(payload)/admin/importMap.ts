import { CollectionCards } from "@payloadcms/next/rsc";
import { S3ClientUploadHandler } from "@payloadcms/storage-s3/client";
import BeforeDashboard from "@/admin/components/dashboard/BeforeDashboard";
import NewEventView from "@/admin/components/wizards/views/NewEventView";
import NewAnnouncementView from "@/admin/components/wizards/views/NewAnnouncementView";
import NewRecapView from "@/admin/components/wizards/views/NewRecapView";

// Auto-managed import map for Payload custom components.
// Kept with known required components to avoid runtime misses before regen.
export const importMap = {
  "@payloadcms/next/rsc#CollectionCards": CollectionCards,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler,
  "@/admin/components/dashboard/BeforeDashboard#default": BeforeDashboard,
  "@/admin/components/wizards/views/NewEventView#default": NewEventView,
  "@/admin/components/wizards/views/NewAnnouncementView#default":
    NewAnnouncementView,
  "@/admin/components/wizards/views/NewRecapView#default": NewRecapView,
};
