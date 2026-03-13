import { supabase } from './supabase';
import { CacheService } from './cache';
import { normalizarCalle } from '../utils/normalizer';

export const buscarCalle = async (query) => {
  const termino = normalizarCalle(query);
  
  let calles = null;
  
  // Intentar desde caché
  const callesCache = CacheService.obtenerCalles();
  if (callesCache) {
    calles = callesCache.filter(c => normalizarCalle(c.nombre).includes(termino));
  }

  // Si no hay en caché o no hay coincidencias, ir a Supabase
  if (!calles || calles.length === 0) {
    const { data, error } = await supabase
      .from('calles')
      .select('*')
      .ilike('nombre', `%${termino}%`)
      .eq('estado', 'aprobado')
      .limit(20); // Aumentamos límite para poder agrupar
    if (error) return { data: [] };
    calles = data;
  }

  // Agrupar por nombre normalizado
  const grupos = {};
  calles.forEach(calle => {
    const nombreNorm = normalizarCalle(calle.nombre);
    if (!grupos[nombreNorm]) {
      grupos[nombreNorm] = {
        nombre: calle.nombre, // nombre original del primer elemento del grupo
        rutas: [],
        puntos: [],
        enlaces: []
      };
    }
    if (calle.ruta_json && Array.isArray(calle.ruta_json)) {
      grupos[nombreNorm].rutas.push(calle.ruta_json);
    }
    if (calle.latitud && calle.longitud) {
      grupos[nombreNorm].puntos.push({ lat: calle.latitud, lng: calle.longitud });
    }
    if (calle.enlace_google_maps) {
      grupos[nombreNorm].enlaces.push(calle.enlace_google_maps);
    }
  });

  // Convertir grupos a objetos combinados
  const combinados = Object.values(grupos).map(g => {
    // Concatenar todas las rutas en una sola
    const rutaCombinada = g.rutas.reduce((acc, r) => acc.concat(r), []);
    return {
      nombre: g.nombre,
      ruta_combinada: rutaCombinada,
      puntos: g.puntos,
      enlaces: g.enlaces,
      // Compatibilidad con vistas anteriores (primer punto o null)
      latitud: g.puntos.length > 0 ? g.puntos[0].lat : null,
      longitud: g.puntos.length > 0 ? g.puntos[0].lng : null,
      enlace_google_maps: g.enlaces.length > 0 ? g.enlaces[0] : null
    };
  });

  // Limitar a 5 resultados
  return { data: combinados.slice(0, 5) };
};
