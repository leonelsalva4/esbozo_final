import { useEffect, useState } from "react";
import { ArrowRight, Info, LogIn, TriangleAlert } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { Button, Notice } from "./ui/Controls";
import { reviewRequest } from "../api/reviews";
import "./ShellDialogs.css";
export type ShellDialog = "guide" | "about" | null;
export type SessionWarning = "inactive" | "expired" | null;
interface Props { token: string; mode: ShellDialog; warning: SessionWarning; onClose: () => void; onAccess: () => void }
const steps = [
  ["Elegí un boceto", "Consultá la ficha del inventario 1582 o 1663."],
  ["Obtené su lote", "La aplicación recupera cuatro proyecciones precomputadas."],
  ["Compará las alternativas", "Usá la vista lado a lado o la superposición con el boceto."],
  ["Revisá etapas y trazabilidad", "Registrá conformidad en el orden de las etapas aplicables."],
  ["Marcá una candidata", "Elegí una alternativa con todas sus etapas aplicables conformes. La marca es reversible."],
];
interface Versions { applicationVersion: string | null; schemaVersion: string | null; dossierSchemaVersion: string | null }
export function ShellDialogs({ token, mode, warning, onClose, onAccess }: Props) {
  const [versions, setVersions] = useState<Versions | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (mode !== "about") return;
    const controller = new AbortController(); setVersions(null); setError(false);
    reviewRequest<Versions>(token, "/api/system/about", { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setVersions(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [token, mode, retry]);
  const inactive = warning === "inactive";
  return <>
    <Dialog open={mode === "guide" && !warning} onClose={onClose} title="Cómo recorrer Esbozo" className="shell-guide" wide icon={<Info size={20} />} actions={<Button variant="primary" onClick={onClose}><ArrowRight size={18} />Empezar</Button>}>
      <p>Un recorrido de consulta y revisión, sin modificar las imágenes.</p>
      <ol className="shell-guide-steps">{steps.map(([title, text], index) => <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol>
    </Dialog>
    <Dialog open={mode === "about" && !warning} onClose={onClose} title="Acerca de Esbozo" className="shell-about" icon={<Info size={20} />} actions={<Button variant="primary" onClick={onClose}>Cerrar</Button>}>
      <p>Aplicación institucional de consulta, comparación y revisión de proyecciones visuales hipotéticas.</p>
      <dl className="shell-about-versions"><div><dt>Aplicación</dt><dd>Esbozo · ejecución local</dd></div>{([['Versión de aplicación', 'applicationVersion'], ['Versión de esquema', 'schemaVersion'], ['Versión de ficha', 'dossierSchemaVersion']] as const).map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{error ? "No disponible" : versions ? versions[key] ?? "No documentado" : "Consultando…"}</dd></div>)}</dl>
      {error && <Notice tone="warning" title="No pudimos consultar las versiones"><Button onClick={() => setRetry(n => n + 1)}>Reintentar</Button></Notice>}
      <p className="shell-about-note">Uso académico, patrimonial, educativo o de investigación. Se mantienen los créditos y las condiciones de uso del material. Las proyecciones no son obras originales ni restauraciones.</p>
    </Dialog>
    <Dialog open={!!warning} onClose={onAccess} title={inactive ? "Tu cuenta fue desactivada" : "Tu sesión venció"} className={inactive ? "shell-session shell-session--inactive" : "shell-session"} icon={inactive ? <TriangleAlert size={20} /> : <Info size={20} />} actions={<Button variant="primary" onClick={onAccess}><LogIn size={18} />Ir al acceso</Button>}>
      <p>{inactive ? "No podés continuar operando con esta cuenta." : "Para continuar, volvé a ingresar con tus credenciales institucionales."}</p>
      <Notice tone={inactive ? "warning" : "neutral"} title={inactive ? "Contactá al administrador" : "El material se conserva"}>{inactive ? "Se conserva el material registrado. Para continuar, necesitás una cuenta activa." : "El lote y las decisiones registradas se conservan. Volvé a ingresar para continuar."}</Notice>
    </Dialog>
  </>;
}
