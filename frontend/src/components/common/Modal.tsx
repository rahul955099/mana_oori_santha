import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-lg font-bold text-stone-900">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
