// In dev, VITE_API_BASE_URL is unset so API_BASE is '' and requests stay
// relative — the Vite proxy in vite.config.ts forwards them to localhost:8000.
// In production (e.g. frontend on Vercel, backend on Render) the frontend and
// backend are different origins, so VITE_API_BASE_URL must be set at build
// time to the backend's https URL.
const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';

export function wsUrl(path: string): string {
  if (API_BASE) return API_BASE.replace(/^http/, 'ws') + path;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
