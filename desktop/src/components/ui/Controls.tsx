import { Check, Circle, Info, AlertTriangle, XCircle, ZoomIn, ZoomOut, Maximize, RotateCcw, CircleCheck, LockKeyhole, Minus, CircleHelp, CirclePause } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
export type Tone = 'neutral' | 'info' | 'warning' | 'error' | 'success';
export function Button({ variant = 'secondary', children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; children: ReactNode }) {
  return <button type="button" {...props} className={`es-button es-button--${variant} ${className}`}>{children}</button>;
}
export function Eyebrow({ children }: { children: ReactNode }) { return <div className="es-eyebrow">{children}</div>; }
const toneIcons = { neutral: Circle, info: Info, warning: AlertTriangle, error: XCircle, success: Check };
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const label = typeof children === 'string' ? children : '';
  const Icon = ['Candidata','Activa'].includes(label) ? CircleCheck : label === 'Pendiente' ? LockKeyhole : label === 'No aplica' ? Minus : label === 'No documentado' ? CircleHelp : label === 'Desactivada' ? CirclePause : toneIcons[tone];
  return <span className={`es-badge es-tone-${tone}`}><Icon size={13} />{children}</span>;
}
export function Notice({ children, title, tone = 'info' }: { children?: ReactNode; title: string; tone?: Tone }) {
  const Icon = toneIcons[tone]; return <div className={`es-notice es-tone-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon size={19} /><div><strong>{title}</strong>{children && <div>{children}</div>}</div></div>;
}
export function Field({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string }) {
  return <div className="es-field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />{error && <span className="es-field-error" id={`${id}-error`}>{error}</span>}</div>;
}
export function Select({ label, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return <div className="es-field"><label htmlFor={id}>{label}</label><select {...props} id={id}>{children}</select></div>;
}
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="es-empty"><Info size={26} /><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  return <nav className="es-pagination" aria-label="Páginas"><Button aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button><span aria-current="page" aria-label={`Página ${page} de ${pages}`}>{page}</span><Button aria-label="Página siguiente" disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</Button></nav>;
}
export function Viewer({ children, label, credit, zoom, onZoom, onReset, onFit }: { children: ReactNode; label?: string; credit?: string; zoom: number; onZoom: (zoom: number) => void; onReset: () => void; onFit: () => void }) {
  return <figure className="es-viewer"><div className="es-viewer-content">{children}</div>{label && <figcaption className="es-viewer-label">{label}</figcaption>}<div className="es-viewer-tools"><button aria-label="Alejar" onClick={() => onZoom(Math.max(25, zoom - 25))}><ZoomOut size={17} /></button><code>{zoom}%</code><button aria-label="Acercar" onClick={() => onZoom(Math.min(400, zoom + 25))}><ZoomIn size={17} /></button><button aria-label="Ajustar imagen" onClick={onFit}><Maximize size={17} /></button><button aria-label="Restablecer vista" onClick={onReset}><RotateCcw size={17} /></button></div>{credit && <div className="es-viewer-credit">{credit}</div>}</figure>;
}
export function AlternativeSelector({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return <div className="es-alternative-selector" role="group" aria-label="Alternativas">{options.map(option => <button key={option.id} aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}</div>;
}

export function StageTabs({ stages, value, onChange }: { stages: { id: string; label: string; status: 'Conforme' | 'Por revisar' | 'Pendiente' | 'No aplica'; disabled?: boolean }[]; value: string; onChange: (id: string) => void }) {
  return <div className="es-stage-tabs" role="group" aria-label="Etapas de producción">{stages.map((stage, index) => <button key={stage.id} disabled={stage.disabled} aria-pressed={value === stage.id} className={`es-stage es-stage--${stage.status === 'Conforme' ? 'success' : stage.status === 'Por revisar' ? 'warning' : 'neutral'}`} onClick={() => onChange(stage.id)}>{stage.status === 'Conforme' ? <CircleCheck size={17} /> : stage.status === 'No aplica' ? <Minus size={17} /> : stage.status === 'Pendiente' ? <LockKeyhole size={17} /> : <Circle size={17} />}<span><strong>{index + 1}. {stage.label}</strong><small>{stage.status}</small></span></button>)}</div>;
}
export function Separator() { return <hr className="es-separator" />; }
