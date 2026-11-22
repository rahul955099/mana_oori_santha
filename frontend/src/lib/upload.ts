import { api } from "@/lib/api";

export type UploadPurpose = "product" | "seller" | "profile";

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  allowed_formats: string;
  signature: string;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Uploads an image straight from the browser to Cloudinary using a
 * signature from our API (the API secret never reaches the browser).
 * Resolves with the image's https URL. */
export async function uploadImage(file: File, purpose: UploadPurpose, onProgress?: (percent: number) => void): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Please choose an image smaller than 5 MB.");
  }

  const sig = await api.post<UploadSignature>("/uploads/signature", { purpose });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("allowed_formats", sig.allowed_formats);
  form.append("signature", sig.signature);

  // XHR rather than fetch so we can report upload progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      // A proxy or outage can answer with HTML; never leave the upload spinning on a parse error.
      let body: { secure_url?: string; error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve(body.secure_url);
      } else if (xhr.status === 401 || /signature|api[_ ]key|cloud name/i.test(body.error?.message ?? "")) {
        // Cloudinary rejected our credentials: a setup problem, not something the user can fix by retrying.
        reject(new Error("The photo service rejected the upload settings. Ask the site admin to check the Cloudinary keys."));
      } else {
        reject(new Error(body.error?.message ?? "The image couldn't be uploaded. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("The image couldn't be uploaded. Check your connection and try again."));
    xhr.send(form);
  });
}
