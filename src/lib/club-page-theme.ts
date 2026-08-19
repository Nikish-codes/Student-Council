export function relativeLuminance(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function colorContrast(first: string, second: string) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

export function hasAccessibleClubTheme(theme: {
  background: string;
  foreground: string;
  accent?: string;
}) {
  return (
    colorContrast(theme.background, theme.foreground) >= 4.5 &&
    (!theme.accent || colorContrast(theme.background, theme.accent) >= 3)
  );
}
