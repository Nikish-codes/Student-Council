import { CollectionCards } from "@payloadcms/next/rsc";
import { S3ClientUploadHandler } from "@payloadcms/storage-s3/client";

// Auto-managed import map for Payload custom components.
// Kept with known required components to avoid runtime misses before regen.
export const importMap = {
	"@payloadcms/next/rsc#CollectionCards": CollectionCards,
	"@payloadcms/storage-s3/client#S3ClientUploadHandler":
		S3ClientUploadHandler,
};
