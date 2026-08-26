export function resolveEventFeatured(input: {
  requested: boolean;
  existing?: boolean | null;
  canFeature: boolean;
}) {
  if (!input.canFeature) return input.existing ?? false;
  return input.requested;
}

export function findFeaturedEvent<T extends { featured: boolean }>(
  events: T[],
) {
  return events.find((event) => event.featured);
}
