import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** How many modals are open; the page stays locked until the last one closes. */
let openModals = 0;
let savedStyles = { htmlOverflow: "", bodyOverflow: "", bodyPaddingRight: "" };

/** Stops the page behind from scrolling, without shifting it when the scrollbar disappears. */
function lockPageScroll() {
  if (openModals++ > 0) return;
  const { body, documentElement } = document;
  savedStyles = { htmlOverflow: documentElement.style.overflow, bodyOverflow: body.style.overflow, bodyPaddingRight: body.style.paddingRight };
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
  // Both elements: mobile browsers keep touch-scrolling the page if only <body> is locked.
  documentElement.style.overflow = "hidden";
  body.style.overflow = "hidden";
}

function unlockPageScroll() {
  if (--openModals > 0) return;
  openModals = 0;
  document.documentElement.style.overflow = savedStyles.htmlOverflow;
  document.body.style.overflow = savedStyles.bodyOverflow;
  document.body.style.paddingRight = savedStyles.bodyPaddingRight;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    lockPageScroll();
    // Focus moves into the content so arrow keys, Page Down and Space scroll the form, not the page.
    const previous = document.activeElement as HTMLElement | null;
    if (!contentRef.current?.contains(document.activeElement)) contentRef.current?.focus({ preventScroll: true });
    return () => {
      unlockPageScroll();
      previous?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="absolute inset-0 touch-none bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      {/* Fits the viewport: the title bar stays put and only the content scrolls. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl animate-[modalIn_0.18s_ease-out]"
      >
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          {title && (
            <h3 id={titleId} className="text-lg font-bold text-stone-900">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </div>
        <div ref={contentRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
