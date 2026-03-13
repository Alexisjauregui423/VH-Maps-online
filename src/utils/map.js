import L from 'leaflet';

let mapInstance = null;

export function crearMapa(containerId, lat = 21.6245, lng = -102.6015, zoom = 15) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map(containerId, { zoomControl: false }).setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OSM'
  }).addTo(mapInstance);
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  return mapInstance;
}

export function getMap() {
  return mapInstance;
}

export function agregarMarcador(map, lat, lng, popupText) {
  if (!map) return;
  return L.marker([lat, lng]).addTo(map).bindPopup(popupText).openPopup();
}

export function agregarControlGeolocalizacion(map, onLocationFound) {
  if (!map) return;

  const btn = L.control({ position: 'topleft' });
  btn.onAdd = function() {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = '<button style="background: white; border: none; cursor: pointer; padding: 5px 10px; font-size: 18px;" title="Mi ubicación">📍</button>';
    div.onclick = function() {
      map.locate({ setView: false, enableHighAccuracy: true });
    };
    return div;
  };
  btn.addTo(map);

  map.on('locationfound', (e) => {
    const { lat, lng } = e.latlng;
    map.flyTo([lat, lng], 18);
    if (onLocationFound) onLocationFound(lat, lng);
  });

  map.on('locationerror', (e) => {
    alert('No se pudo obtener tu ubicación: ' + e.message);
  });
}
