import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Mana Oori Santha";
const DEFAULT_DESCRIPTION =
  "Buy millets, pulses, cold-pressed oils, dry fruits and traditional foods directly from local farmers in Andhra Pradesh and Telangana.";

interface SeoProps {
  /** Page title without the site name, e.g. "Foxtail Millet". */
  title?: string;
  description?: string;
  /** Absolute image URL for link previews (WhatsApp, Facebook, etc.). */
  image?: string;
  /** Keep private or utility pages (checkout, reset password) out of search results. */
  noIndex?: boolean;
  /** Structured data for rich search results, e.g. a schema.org Product. */
  jsonLd?: Record<string, unknown>;
}

function setMeta(attr: "name" | "property", key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Sets the page's title, description, share-preview and indexing tags.
 * Renders nothing; place it once near the top of a page. */
export function Seo({ title, description = DEFAULT_DESCRIPTION, image, noIndex = false, jsonLd }: SeoProps) {
  const { pathname } = useLocation();
  const json = jsonLd ? JSON.stringify(jsonLd) : "";
  const isProduct = jsonLd?.["@type"] === "Product";

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Local Marketplace for Natural & Traditional Foods`;
    const url = `${window.location.origin}${pathname}`;
    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : undefined);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", isProduct ? "product" : "website");
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    document.getElementById("seo-jsonld")?.remove();
    if (json) {
      const script = document.createElement("script");
      script.id = "seo-jsonld";
      script.type = "application/ld+json";
      script.textContent = json;
      document.head.appendChild(script);
    }
  }, [title, description, image, noIndex, json, isProduct, pathname]);

  return null;
}
