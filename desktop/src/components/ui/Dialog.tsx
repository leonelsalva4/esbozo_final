import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export function Dialog({ open, onClose, title, children, actions, icon, className = '', wide = false, drawer = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; icon?: ReactNode; className?: string; wide?: boolean; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    dialog?.addEventListener('keydown', trapFocus);
    return () => { dialog?.removeEventListener('keydown', trapFocus); dialog?.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={ref} className={`es-dialog ${className} ${wide ? 'es-dialog--wide' : ''} ${drawer ? 'es-dialog--drawer' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); closeRef.current(); }}>
    <button className="es-dialog-close es-icon-button" aria-label="Cerrar" onClick={onClose} autoFocus><X size={20} /></button>
    {icon && <div className="es-dialog-icon">{icon}</div>}<h2 id={titleId}>{title}</h2><div className="es-dialog-body">{children}</div>{actions && <div className="es-dialog-actions">{actions}</div>}
  </dialog>, document.body);
}
export function Drawer(props: Omit<Parameters<typeof Dialog>[0], 'drawer'>) { return <Dialog {...props} drawer />; }
