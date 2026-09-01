// Deterministic placeholder photography (via Picsum) so every product, category,
// seller and hero image is stable and looks like premium stock photography.
// `lock` pins a specific photo so the same entity always shows the same image;
// `keywords` is kept as a readable label for future replacement with real assets.
export function themedImage(keywords: string, lock: number, size = 600): string {
  const seed = `mos-${keywords.replace(/\s+/g, "-").toLowerCase()}-${lock}`;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;
}
