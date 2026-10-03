/** For Cloudinary images, asks the CDN for a resized, auto-format (WebP/AVIF)
 * copy instead of the full original. Other URLs are returned unchanged. */
export function optimizedImage(url: string | undefined, width: number): string {
  if (!url) return "";
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  return url.replace(marker, `${marker}f_auto,q_auto,c_limit,w_${width}/`);
}
