// Centralized official website / customer support contact details.
// Contact page and Footer import these instead of hardcoding their own copy,
// so there is a single source of truth — override via env vars if needed.
export const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "9493043575";
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "leuchtergroup@gmail.com";

export const SUPPORT_ADDRESS =
  import.meta.env.VITE_SUPPORT_ADDRESS ||
  "Plot No. 108/A, H.No. 8-7-94/D, Dwaraka Nagar, Hastinapuram South, Karmanghat, near Shivalayam Temple, Saroornagar, Hyderabad, Telangana 500079";

export const SUPPORT_PHONE_TEL_HREF = `tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`;
export const SUPPORT_EMAIL_MAILTO_HREF = `mailto:${SUPPORT_EMAIL}`;

// Social media pages shown in the footer. Leave a link empty to hide its icon.
export const SOCIAL_LINKS = {
  facebook: import.meta.env.VITE_SOCIAL_FACEBOOK || "",
  instagram: import.meta.env.VITE_SOCIAL_INSTAGRAM || "",
  twitter: import.meta.env.VITE_SOCIAL_TWITTER || "",
};
