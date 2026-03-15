// utils/map.js
import L             from 'leaflet';
import { mostrarToast } from './toast';

// ─────────────────────────────────────────────────────────────────────────────
// FIX CRÍTICO: Leaflet + Vite rompe las imágenes del marcador por defecto
// porque el bundler no puede resolver las rutas relativas internas de Leaflet.
// Hay que importarlas explícitamente y sobreescribir el ícono global.
// ─────────────────────────────────────────────────────────────────────────────
import iconUrl       from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

let mapInstance    = null;
let locationMarker = null;   // marcador puntual de "mi ubicación"
let locationCircle = null;   // círculo de precisión

// ─────────────────────────────────────────────────────────────────────────────
// Singleton del mapa
// ─────────────────────────────────────────────────────────────────────────────

export function crearMapa(containerId, lat = 21.678470, lng = -102.588384, zoom = 15) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance    = null;
    locationMarker = null;
    locationCircle = null;
  }

  mapInstance = L.map(containerId, { zoomControl: false }).setView([lat, lng], zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
    // crossOrigin necesario para que el SW pueda interceptar los tiles
    crossOrigin: true,
  }).addTo(mapInstance);

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  return mapInstance;
}

export function getMap() {
  return mapInstance;
}

export function agregarMarcador(map, lat, lng, popupText) {
  if (!map) return null;
  return L.marker([lat, lng]).addTo(map).bindPopup(popupText).openPopup();
}

// ─────────────────────────────────────────────────────────────────────────────
// Capa base de calles (fondo del mapa)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dibuja todas las calles como polilíneas/puntos de fondo.
 * Usa color neutro para no interferir con la calle seleccionada (indigo).
 * Retorna un LayerGroup que puedes quitar si lo necesitas.
 */
export function dibujarCapaCalles(map, calles) {
  if (!map || !calles?.length) return null;

  const capas = [];

  calles.forEach(c => {
    try {
      if (c.ruta_json?.length >= 2) {
        const latLngs = c.ruta_json.map(p => [p[1], p[0]]);
        const poly = L.polyline(latLngs, {
          color:   '#94a3b8',
          weight:  3,
          opacity: 0.45,
          interactive: true,
        }).bindTooltip(c.nombre, { sticky: true, direction: 'top', opacity: 0.85 });
        capas.push(poly);

      } else if (c.latitud && c.longitud) {
        const dot = L.circleMarker([c.latitud, c.longitud], {
          radius:      5,
          color:       '#94a3b8',
          fillColor:   '#94a3b8',
          fillOpacity: 0.55,
          weight:      1,
          interactive: true,
        }).bindTooltip(c.nombre, { sticky: true, opacity: 0.85 });
        capas.push(dot);
      }
    } catch {
      // Ignorar registros con coordenadas malformadas
    }
  });

  if (!capas.length) return null;

  const grupo = L.layerGroup(capas);
  try {
    grupo.addTo(map);
  } catch {
    // El mapa fue destruido antes de que resolviera el async
  }
  return grupo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Control de geolocalización
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agrega botón 📍 que:
 *  1. Centra el mapa en la ubicación del usuario
 *  2. Muestra un marcador persistente (no desaparece al tocar el mapa)
 *  3. Muestra un círculo de precisión
 *  4. Usa toast en lugar de alert() para errores
 *
 * @param {L.Map}    map
 * @param {Function} onLocationFound  callback(lat, lng) opcional
 */
export function agregarControlGeolocalizacion(map, onLocationFound) {
  if (!map) return;

  // bottomright: se apila sobre los botones de zoom y nunca queda
  // tapado por el overlay flotante (header + buscador) que cubre el topleft.
  const ctrl = L.control({ position: 'bottomright' });

  ctrl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = `
      <button
        id="btn-geolocate"
        title="Mi ubicación"
        style="
          background:#fff; border:none; cursor:pointer;
          padding:5px 10px; font-size:18px; line-height:1;
          display:flex; align-items:center; justify-content:center;
        "
      >📍</button>
    `;

    // Previene que el click se propague al mapa (evita pin accidental en userView)
    L.DomEvent.disableClickPropagation(div);

    L.DomEvent.on(div.querySelector('#btn-geolocate'), 'click', () => {
      map.locate({ setView: false, enableHighAccuracy: true, timeout: 10000 });
    });

    return div;
  };

  ctrl.addTo(map);

  // ── Ubicación encontrada ────────────────────────────────────────────────
  map.on('locationfound', (e) => {
    const { lat, lng } = e.latlng;
    const acc          = Math.round(e.accuracy);

    // Quitar marcadores anteriores
    if (locationMarker) { map.removeLayer(locationMarker); }
    if (locationCircle) { map.removeLayer(locationCircle); }

    // Círculo de precisión (radio = accuracy/2)
    locationCircle = L.circle([lat, lng], {
      radius:      e.accuracy / 2,
      color:       '#4f46e5',
      fillColor:   '#c7d2fe',
      fillOpacity: 0.18,
      weight:      1.5,
      interactive: false,
    }).addTo(map);

    // Marcador puntual con borde blanco
    locationMarker = L.circleMarker([lat, lng], {
      radius:      10,
      color:       '#fff',
      weight:      3,
      fillColor:   '#4f46e5',
      fillOpacity: 1,
    }).addTo(map)
      .bindPopup(`<b>📍 Tu ubicación</b><br><small>Precisión: ±${acc} m</small>`)
      .openPopup();

    map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });

    if (onLocationFound) onLocationFound(lat, lng);
  });

  // ── Error de geolocalización ────────────────────────────────────────────
  map.on('locationerror', (e) => {
    if (e.code === 1) {
      mostrarToast('Permiso de ubicación denegado', 'warning');
    } else if (e.code === 3) {
      mostrarToast('Tiempo agotado al obtener ubicación', 'warning');
    } else {
      mostrarToast('No se pudo obtener tu ubicación', 'warning');
    }
  });
}
