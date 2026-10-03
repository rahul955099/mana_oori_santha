/** An https URL (e.g. a Cloudinary image), or empty to clear the field. */
export function isImageUrl(value: unknown): boolean {
  if (value === "") return true;
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UPI_PATTERN = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
