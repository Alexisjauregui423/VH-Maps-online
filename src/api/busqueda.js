// api/busqueda.js
import { supabase }                    from './supabase';
import { CacheService }                from './cache';
import { normalizarCalle, scoreBusqueda } from '../utils/normalizer';

// Solo pedimos los campos que realmente necesitamos
const CAMPOS = 'id, nombre, latitud, longitud, ruta_json, enlace_google_maps';

// ─────────────────────────────────────────────────────────────────────────────
// PRECALENTAMIENTO — una sola query al iniciar la app
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Descarga TODAS las calles aprobadas y las guarda en caché.
 * Si el caché ya es válido NO hace ninguna llamada a Supabase.
 * Llama esto en main.js al inicializar la app.
 */
export const precalentarCache = async () => {
  if (CacheService.obtenerCalles() !== null) return; // ya en caché — 0 queries

  const { data, error } = await supabase
    .from('calles')
    .select(CAMPOS)
    .eq('estado', 'aprobado')
    .order('nombre');

  if (!error && data?.length) {
    CacheService.guardarCalles(data);
  }
};

/**
 * Igual que precalentarCache pero compara el timestamp de Supabase
 * con el del caché local antes de descargar.
 * Útil para llamar en el login (invalida si hay calles nuevas en BD).
 */
export const sincronizarCache = async () => {
  // 1. Obtenemos la fecha de la calle más reciente en Supabase (1 fila, sin data)
  const { data: latest } = await supabase
    .from('calles')
    .select('creado_en')
    .eq('estado', 'aprobado')
    .order('creado_en', { ascending: false })
    .limit(1)
    .single();

  if (!latest) return;

  const tsSupabase = new Date(latest.creado_en).getTime();
  const tsLocal    = CacheService.getTimestampCalles();

  // 2. Solo recarga si Supabase tiene datos más nuevos
  if (tsSupabase > tsLocal) {
    CacheService.invalidarCalles();
    await precalentarCache();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA — 100% local si el caché está caliente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca calles por nombre.
 * - 0 queries a Supabase si el caché está caliente (caso normal)
 * - 1 query solo si el caché expiró o nunca se llenó
 * - Normaliza acentos, expande abreviaciones, rankea por score
 * - Agrupa segmentos de la misma calle y concatena sus rutas
 * - Devuelve máximo 5 resultados ordenados por relevancia
 */
export const buscarCalle = async (query) => {
  if (!query?.trim()) return { data: [] };

  // Aseguramos que el caché esté disponible
  let todas = CacheService.obtenerCalles();
  if (!todas) {
    await precalentarCache();
    todas = CacheService.obtenerCalles() ?? [];
  }

  // Filtrar y puntuar localmente — sin red
  const candidatas = todas
    .map(c => ({ c, score: scoreBusqueda(query, c.nombre) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ c }) => c);

  if (!candidatas.length) return { data: [] };

  // Agrupar por nombre normalizado (varios registros pueden ser la misma calle)
  const grupos = {};
  candidatas.forEach(calle => {
    const key = normalizarCalle(calle.nombre);
    if (!grupos[key]) {
      grupos[key] = { nombre: calle.nombre, rutas: [], puntos: [], enlaces: [] };
    }
    const g = grupos[key];
    if (calle.ruta_json?.length)         g.rutas.push(calle.ruta_json);
    if (calle.latitud && calle.longitud) g.puntos.push({ lat: calle.latitud, lng: calle.longitud });
    if (calle.enlace_google_maps)        g.enlaces.push(calle.enlace_google_maps);
  });

  const combinados = Object.values(grupos).map(g => ({
    nombre:             g.nombre,
    ruta_combinada:     g.rutas.flat(),
    puntos:             g.puntos,
    enlaces:            g.enlaces,
    latitud:            g.puntos[0]?.lat  ?? null,
    longitud:           g.puntos[0]?.lng  ?? null,
    enlace_google_maps: g.enlaces[0]      ?? null,
  }));

  return { data: combinados.slice(0, 5) };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER para la capa de mapa
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve TODAS las calles del caché para pintar la capa base del mapa.
 * No hace llamadas a Supabase si el caché está caliente.
 */
export const obtenerTodasCalles = async () => {
  let todas = CacheService.obtenerCalles();
  if (!todas) {
    await precalentarCache();
    todas = CacheService.obtenerCalles() ?? [];
  }
  return todas;
};
