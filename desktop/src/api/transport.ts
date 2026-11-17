export const SESSION_EVENT = "esbozo:session-unavailable";
export type SessionFailure = { token: string; reason: "inactive" | "expired" };
// Las fallas de permisos y de conexión no equivalen a una sesión vencida.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401 && response.status !== 403) return response;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const authorization = headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response;
  try {
    const body = await response.clone().json();
    if (response.status === 401 || body.code === "ACCOUNT_INACTIVE") {
      window.dispatchEvent(new CustomEvent<SessionFailure>(SESSION_EVENT, { detail: { token: authorization.slice(7), reason: body.code === "ACCOUNT_INACTIVE" ? "inactive" : "expired" } }));
    }
  } catch { /* Un error sin respuesta de autenticación legible conserva la sesión local. */ }
  return response;
}
