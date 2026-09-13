import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
  const previous = document.activeElement as HTMLElement | null;
  ref.current?.focus();
  const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = oldOverflow; previous?.focus(); };
 }, []);
 return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
  <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1} onKeyDown={e => {
   if (e.key === 'Escape' && !busy) onClose();
   if (e.key === 'Tab') { const elements = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'); if (!elements?.length) { e.preventDefault(); return; } const first = elements[0]; const last = elements[elements.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); } }
  }}>
   <div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20}/></button></div>
   {children}
  </div>
 </div>;
}
