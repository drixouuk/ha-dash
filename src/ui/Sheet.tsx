import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="h2">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
