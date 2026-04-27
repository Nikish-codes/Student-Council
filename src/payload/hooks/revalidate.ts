import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

/**
 * After-change/after-delete hook that revalidates the given Next.js
 * cache paths so editors see their changes on the public site without
 * waiting for a manual rebuild.
 *
 * `revalidatePath` is dynamically imported so this module stays safe
 * to load outside a Next request (e.g. during Payload init / tests).
 */
export function revalidateAfterChange(
  paths: string[],
): CollectionAfterChangeHook & CollectionAfterDeleteHook & GlobalAfterChangeHook {
  return async () => {
    try {
      const { revalidatePath } = await import("next/cache");
      for (const p of paths) {
        try {
          revalidatePath(p);
        } catch {
          // ignore — happens when called outside a Next runtime
        }
      }
    } catch {
      // next/cache not available in this runtime — fine
    }
  };
}
