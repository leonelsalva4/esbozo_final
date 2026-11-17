import wordmark from '../../assets/esbozo-wordmark.png';

export function Brand({ width = 160 }: { width?: number }) {
  return <span className="es-brand" style={{ width }}><img src={wordmark} alt="Esbozo" /></span>;
}
export function ColorStrip() {
  return <div className="es-color-strip" aria-hidden="true"><span /><span /><span /><span /></div>;
}
export function PageFooter({ reference }: { reference?: string }) {
  return <footer className="es-footer"><span>{reference ? 'Maqueta de interfaz · Datos de demostración · Identificadores provisionales' : 'Esbozo · Aplicación local de consulta y revisión · Uso institucional'}</span>{reference && <code>{reference}</code>}</footer>;
}
