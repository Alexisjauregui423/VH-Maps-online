// utils/normalizer.js

/**
 * Normaliza el texto de una calle:
 * - Minúsculas
 * - Quita acentos (á→a, é→e, ñ→n, etc.)
 * - Expande abreviaciones comunes
 * - Elimina la palabra genérica "calle"
 * - Colapsa espacios múltiples
 */
export const normalizarCalle = (texto) => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar diacríticos (acentos, diéresis, ñ→n)
    .replace(/\bprol\.?\b/g,  'prolongacion')
    .replace(/\bav\.?\b/g,    'avenida')
    .replace(/\bblvd?\.?\b/g, 'bulevar')
    .replace(/\bclzda?\.?\b/g,'calzada')
    .replace(/\bcarr\.?\b/g,  'carretera')
    .replace(/\bfracc?\.?\b/g,'fraccionamiento')
    .replace(/\bcol\.?\b/g,   'colonia')
    .replace(/\bbarr?\.?\b/g, 'barrio')
    .replace(/\bcalle\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Score de relevancia entre query y nombre de calle — rango [0, 1].
 *
 *  1.0  → igual exacto (normalizado)
 *  0.9  → el candidato empieza con el término
 *  0.75 → el candidato contiene el término completo
 *  0..0.65 → coincidencia parcial por palabras individuales
 *  0    → sin coincidencia
 *
 * Ejemplo:
 *   scoreBusqueda('hidalgo', 'Calle Hidalgo')          → 1.0
 *   scoreBusqueda('hidal',   'Av. Hidalgo Sur')        → 0.9
 *   scoreBusqueda('juarez',  'Prolongacion Juárez')    → 0.75
 *   scoreBusqueda('20 nov',  'Calle 20 de Noviembre')  → 0.43
 */
export const scoreBusqueda = (query, nombre) => {
  const t = normalizarCalle(query);
  const c = normalizarCalle(nombre);

  if (!t || !c) return 0;
  if (c === t)           return 1;
  if (c.startsWith(t))  return 0.9;
  if (c.includes(t))    return 0.75;

  // Coincidencia por palabras individuales (ignora palabras de 1 char)
  const palabras = t.split(' ').filter(p => p.length > 1);
  if (!palabras.length) return 0;

  const hits = palabras.filter(p => c.includes(p)).length;
  return (hits / palabras.length) * 0.65;
};
