import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, Link2 } from "lucide-react";
import { uploadImage, ACCEPTED_IMAGE_TYPES, type UploadPurpose } from "@/lib/upload";
import { optimizedImage } from "@/utils/image";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  purpose: UploadPurpose;
  /** Maximum number of images (1 for a single photo). */
  max?: number;
  /** Round previews, e.g. for profile photos. */
  round?: boolean;
  /** Lets the user paste an existing https image URL instead of uploading. */
  allowUrl?: boolean;
}

/** Uploads images to Cloudinary and shows previews. The first image is
 * treated as the main one wherever order matters. */
export function ImageUploader({ value, onChange, purpose, max = 1, round = false, allowUrl = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const canAdd = value.length < max && progress === null;
  const shape = round ? "rounded-full" : "rounded-xl";

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const url = await uploadImage(file, purpose, setProgress);
      onChange(max === 1 ? [url] : [...value, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!/^https:\/\/\S+$/.test(url)) {
      setError("Please paste an https:// image link.");
      return;
    }
    setError("");
    onChange(max === 1 ? [url] : [...value, url]);
    setUrlInput("");
    setUrlOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {value.map((url, i) => (
          <div key={url} className={`relative h-20 w-20 overflow-hidden bg-stone-100 ${shape}`}>
            <img src={optimizedImage(url, 200)} alt="" className="h-full w-full object-cover" />
            {max > 1 && i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-stone-900/60 py-0.5 text-center text-[10px] font-bold text-white">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== url))}
              aria-label="Remove image"
              className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-stone-600 shadow hover:text-red-600"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {progress !== null && (
          <div className={`flex h-20 w-20 flex-col items-center justify-center gap-1 bg-stone-100 text-xs font-semibold text-stone-500 ${shape}`}>
            <Loader2 size={18} className="animate-spin text-primary-600" />
            {progress}%
          </div>
        )}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`flex h-20 w-20 flex-col items-center justify-center gap-1 border-2 border-dashed border-stone-300 text-[11px] font-semibold text-stone-500 transition hover:border-primary-400 hover:text-primary-700 ${shape}`}
          >
            <ImagePlus size={20} />
            {value.length === 0 ? "Upload" : max === 1 ? "Replace" : "Add"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className="mt-2 text-[11px] text-stone-400">
        JPG, PNG or WebP, up to 5 MB{max > 1 ? ` · up to ${max} photos, the first is the main photo` : ""}.
        {allowUrl && canAdd && !urlOpen && (
          <button type="button" onClick={() => setUrlOpen(true)} className="ml-1 inline-flex items-center gap-0.5 font-semibold text-primary-700 hover:underline">
            <Link2 size={11} /> Paste a link instead
          </button>
        )}
      </p>
      {urlOpen && (
        <div className="mt-2 flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
          <button type="button" onClick={addUrl} className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white">
            Add
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
