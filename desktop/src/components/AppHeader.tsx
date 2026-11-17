import { apiFetch } from "../api/transport";
import { useContext, useEffect, useId, useRef, useState } from 'react';
import { Home, Image, Layers, FolderOpen, Users, ClipboardList, ChevronDown, ChevronRight, LogOut, BookOpen, Info } from 'lucide-react';
import type { Session } from '../screens/Login/LoginScreen';
import { Brand, ColorStrip } from './ui/Brand';
import './AppHeader.css';
import { LotsNavigation } from './LotsNavigation';
import { ShellActions } from './ShellActions';
export type NavKey = 'inicio' | 'boceto' | 'alternativas' | 'lotes';
export interface BreadcrumbItem { label: string; onClick?: () => void; }
interface AppHeaderProps {
  active: NavKey; breadcrumb: BreadcrumbItem[]; session: Session; onLogout: () => void;
  onNavigate: (key: NavKey) => void; navEnabled: Partial<Record<NavKey, boolean>>;
  adminNavigation?: { active: 'cuentas' | 'registro'; onNavigate: (key: 'cuentas' | 'registro') => void };
  onGuide?: () => void; onAbout?: () => void; onOperations?: () => void;
  preview?: boolean; accountSubtitle?: string;
  navigationHint?: string; plainHomeBreadcrumb?: boolean;
}
const navItems = [{ key: 'inicio', label: 'Inicio', icon: Home }, { key: 'boceto', label: 'Boceto', icon: Image }, { key: 'alternativas', label: 'Alternativas', icon: Layers }, { key: 'lotes', label: 'Lotes', icon: FolderOpen }] as const;
export function AppHeader({ active, breadcrumb, session, onLogout, onNavigate, navEnabled, adminNavigation, onGuide, onAbout, onOperations, preview = false, accountSubtitle, navigationHint, plainHomeBreadcrumb = false }: AppHeaderProps) {
  const shell = useContext(ShellActions);
  onGuide ??= shell.onGuide; onAbout ??= shell.onAbout; onOperations ??= shell.onOperations;
  const goLots = useContext(LotsNavigation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuId = useId();
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const admin = session.user.role === 'admin' || session.user.role === 'administrador';
  useEffect(() => {
    if (!menuOpen) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button'); first?.focus();
    function outside(event: PointerEvent) { if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false); }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { setMenuOpen(false); triggerRef.current?.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        if (!items.length) return;
        event.preventDefault(); const index = items.indexOf(document.activeElement as HTMLButtonElement);
        items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
  }, [menuOpen]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { if (!preview) await apiFetch('http://localhost:4000/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }); }
    catch { /* El cierre local sigue disponible si el servidor no responde. */ }
    finally { onLogout(); setMenuOpen(false); setLoggingOut(false); }
  }
  function action(callback: () => void) { setMenuOpen(false); callback(); }
  return <header className={`es-app-header ${plainHomeBreadcrumb ? 'es-app-header--home' : ''}`}><ColorStrip /><div className="es-header-bar"><Brand />
    <nav className="es-header-nav" aria-label="Navegación principal">{admin ? <>{[{ key: 'cuentas', label: 'Cuentas', icon: Users }, { key: 'registro', label: 'Registro de operaciones', icon: ClipboardList }].map(({ key, label, icon: Icon }) => <button key={key} className={adminNavigation?.active === key ? 'active' : ''} aria-current={adminNavigation?.active === key ? 'page' : undefined} disabled={!adminNavigation} onClick={() => adminNavigation?.onNavigate(key as 'cuentas' | 'registro')}><Icon size={17} />{label}</button>)}</> : navItems.map(({ key, label, icon: Icon }) => <button key={key} className={active === key ? 'active' : ''} aria-current={active === key ? 'page' : undefined} disabled={key !== 'inicio' && !navEnabled[key]} onClick={() => key === 'lotes' && goLots ? goLots() : onNavigate(key)}><Icon size={17} />{label}</button>)}{navigationHint && <span className="es-header-nav-hint">{navigationHint}</span>}</nav>
    <div className="es-header-account" ref={accountRef}><button className="es-header-user" ref={triggerRef} aria-expanded={menuOpen} aria-controls={menuId} aria-haspopup="menu" onClick={() => setMenuOpen(value => !value)}><span className="es-header-avatar">{admin ? 'ad' : 'ui'}</span><span className="es-header-identity"><strong>{admin ? 'Administrador' : 'Usuario institucional'}</strong><span>{accountSubtitle ?? session.user.username}</span></span><ChevronDown size={16} /></button>
      {menuOpen && <div className="es-header-menu" id={menuId} role="menu" ref={menuRef} onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setMenuOpen(false); }}>
        <div className="es-header-menu-identity"><strong>{session.user.displayName}</strong><span>{session.user.username}</span></div>
        {!admin && onOperations && <button role="menuitem" onClick={() => action(onOperations)}><ClipboardList size={17} />Registro de operaciones</button>}{!admin && onGuide && <button role="menuitem" onClick={() => action(onGuide)}><BookOpen size={17} />Cómo recorrer Esbozo</button>}{onAbout && <button role="menuitem" onClick={() => action(onAbout)}><Info size={17} />Acerca de Esbozo</button>}
        <button role="menuitem" disabled={loggingOut} onClick={logout}><LogOut size={17} />{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</button>
      </div>}
    </div></div><nav className="es-header-breadcrumb" aria-label="Ubicación">{!plainHomeBreadcrumb && <Home size={14} />}{breadcrumb.map((crumb, index) => <span key={`${index}-${crumb.label}`}>{index > 0 && <ChevronRight size={12} />}{crumb.onClick ? <button onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current={index === breadcrumb.length - 1 ? 'page' : undefined}>{crumb.label}</span>}</span>)}</nav></header>;
}
