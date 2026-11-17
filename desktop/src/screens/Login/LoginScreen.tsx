import { useState, type FormEvent } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import wordmark from "../../assets/esbozo-wordmark.png";
import logoMark from "../../assets/esbozo-logo-mark.png";
import dashIcon from "../../assets/icon-dash.svg";
import "./LoginScreen.css";

export interface Session {
  token: string;
  user: { username: string; displayName: string; role: string };
}

interface LoginScreenProps {
  onLoginSuccess: (session: Session) => void;
}

const API_URL = "http://localhost:4000/api/auth/login";

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      onLoginSuccess(data as Session);
    } catch {
      setError("No se pudo conectar con el backend. Verificá que esté corriendo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="panel-identidad">
        <div className="fachada">
          <div className="pano pano-1" />
          <div className="pano pano-2" />
          <div className="pano pano-3" />
          <div className="pano pano-4" />
          <div className="pano pano-5" />
          <div className="pano pano-6" />
          <div className="pano luz-2" />
          <div className="pano luz-4" />
          <div className="nervadura" />
          <div className="fade-top" />
          <div className="fade-bottom" />
        </div>
        <div className="identidad-footer">
          <div className="wordmark-frame">
            <img src={wordmark} alt="Esbozo" />
          </div>
          <div className="divider">
            <span /><span /><span /><span />
          </div>
          <p className="tagline">Exploración institucional de proyecciones visuales hipotéticas</p>
        </div>
      </div>

      <div className="panel-acceso">
        <div className="top-accent" />
        <div className="left-border" />

        <div className="login-card">
          <img className="logo-mark" src={logoMark} alt="" />

          <div className="eyebrow">
            <img src={dashIcon} alt="" />
            ACCESO RESTRINGIDO
          </div>

          <h1 className="login-title">Acceso institucional</h1>

          <div className="card-padded">
            <p className="description">
              Ingresá con las credenciales asignadas para
              <br />
              consultar los bocetos y sus proyecciones.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="username">USUARIO</label>
                <div className="input-wrap">
                  <User size={18} />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password">CONTRASEÑA</label>
                <div className="input-wrap">
                  <Lock size={18} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Ingresando…" : "Iniciar sesión"}
              </button>
            </form>

            <p className="footer-note">¿Sin acceso? Lo gestiona el administrador del sistema.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
