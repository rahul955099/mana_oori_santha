export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function discountPercent(price: number, mrp: number): number {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** The product's Telugu name, or null when there isn't one (never "undefined" or blank). */
export function teluguName(product: { nameTe?: string | null }): string | null {
  const name = product.nameTe?.trim();
  return name ? name : null;
}

/** Case-insensitive match on a product's English or Telugu name. */
export function matchesProductName(product: { name: string; nameTe?: string | null }, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return product.name.toLowerCase().includes(q) || (product.nameTe ?? "").toLowerCase().includes(q);
}

export function categoryLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
