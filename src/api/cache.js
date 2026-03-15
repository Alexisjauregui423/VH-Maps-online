// api/cache.js
// ─────────────────────────────────────────────────────────────────────────────
// Llaves y TTLs
// ─────────────────────────────────────────────────────────────────────────────
const LLAVE_CALLES    = 'vh_maps_calles_v2';      // se incrementa versión para limpiar caché viejo
const LLAVE_CALLES_TS = 'vh_maps_calles_ts';
const LLAVE_DIRS_PFX  = 'vh_dirs_';               // + userId

const TTL_CALLES = 86_400_000;  // 24 h  — calles cambian poco
const TTL_DIRS   =  3_600_000;  //  1 h  — dirs del usuario pueden cambiar más seguido

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // QuotaExceededError — el dispositivo no tiene espacio
    console.warn('[Cache] No se pudo guardar', key, e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CacheService
// ─────────────────────────────────────────────────────────────────────────────
export const CacheService = {

  // ── Calles ──────────────────────────────────────────────────────────────────

  /** Guarda el array completo de calles aprobadas. */
  guardarCalles(calles) {
    const ts = Date.now();
    safeSet(LLAVE_CALLES,    { ts, calles });
    safeSet(LLAVE_CALLES_TS, ts);
  },

  /**
   * Devuelve el array de calles o null si:
   *  - No existe
   *  - Expiró (>24 h)
   *  - Datos corruptos
   */
  obtenerCalles() {
    const raw = localStorage.getItem(LLAVE_CALLES);
    if (!raw) return null;
    const data = safeParse(raw);
    if (!data || Date.now() - data.ts > TTL_CALLES) return null;
    return data.calles ?? null;
  },

  /** Timestamp (ms epoch) de la última sincronización de calles. 0 si nunca. */
  getTimestampCalles() {
    return parseInt(localStorage.getItem(LLAVE_CALLES_TS) ?? '0', 10);
  },

  /** Fuerza recarga en la próxima consulta. */
  invalidarCalles() {
    localStorage.removeItem(LLAVE_CALLES);
    localStorage.removeItem(LLAVE_CALLES_TS);
  },

  // ── Direcciones del usuario ──────────────────────────────────────────────────

  /** Guarda las direcciones de un usuario. */
  guardarDirecciones(userId, dirs) {
    if (!userId) return;
    safeSet(LLAVE_DIRS_PFX + userId, { ts: Date.now(), dirs });
  },

  /**
   * Devuelve las direcciones del usuario o null si
   * no existen, expiraron (>1 h) o están corruptas.
   */
  obtenerDirecciones(userId) {
    if (!userId) return null;
    const raw = localStorage.getItem(LLAVE_DIRS_PFX + userId);
    if (!raw) return null;
    const data = safeParse(raw);
    if (!data || Date.now() - data.ts > TTL_DIRS) return null;
    return data.dirs ?? null;
  },

  /** Invalida el caché de direcciones de un usuario (tras guardar una nueva). */
  invalidarDirecciones(userId) {
    if (!userId) return;
    localStorage.removeItem(LLAVE_DIRS_PFX + userId);
  },

  // ── Limpieza total ──────────────────────────────────────────────────────────

  /** Elimina TODO el caché de VH-Maps del localStorage. */
  limpiarTodo() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('vh_'));
    keys.forEach(k => localStorage.removeItem(k));
  },
};
