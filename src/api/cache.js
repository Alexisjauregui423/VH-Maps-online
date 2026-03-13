export const CacheService = {
  llave: 'vh_maps_calles_cache',

  guardarCalles(calles) {
    const data = {
      timestamp: Date.now(),
      calles: calles
    };
    localStorage.setItem(this.llave, JSON.stringify(data));
  },

  obtenerCalles() {
    const cached = localStorage.getItem(this.llave);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    // El caché expira cada 24 horas para refrescar nuevas calles
    if (Date.now() - data.timestamp > 86400000) {
      return null;
    }
    return data.calles;
  }
};
