// ui/publicView.js
import L from 'leaflet';
import { crearMapa, agregarControlGeolocalizacion } from '../utils/map';
import { buscarCalle } from '../api/busqueda';
import { mostrarToast } from '../utils/toast';

let rutaPolyline = null;
let marcadoresPuntos = [];

export function renderPublicView(container) {
  document.body.classList.add('map-view');

  container.innerHTML = `
    <div class="map-wrapper">
      <div id="map"></div>
      <div class="map-overlay">

        <!-- Header -->
        <div class="map-header">
          <h2>📍 VH-Maps</h2>
          <button id="settings-btn" class="btn-link" style="width:auto; padding:4px 8px; font-size:1.4rem; text-decoration:none;">⚙️</button>
        </div>

        <!-- Buscador -->
        <div class="search-box">
          <input
            type="text"
            id="input-busqueda"
            placeholder="🔍 Buscar calle o tramo..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
          >
        </div>

        <!-- Lista de resultados -->
        <ul id="lista-coincidencias" class="lista-sugerencias" style="display:none;"></ul>

        <!-- Panel info de calle seleccionada -->
        <div id="calle-panel" class="calle-info-panel" style="display:none;"></div>

      </div>
    </div>
  `;

  const map = crearMapa('map', 21.678470, -102.588384, 15);
  agregarControlGeolocalizacion(map);

  const input  = container.querySelector('#input-busqueda');
  const lista  = container.querySelector('#lista-coincidencias');
  const panel  = container.querySelector('#calle-panel');

  // ─── Limpiar selección al hacer click en el mapa ───────────────────────
  map.on('click', () => {
    limpiarCapas(map);
    panel.style.display = 'none';
    lista.style.display = 'none';
  });

  // ─── Búsqueda con debounce ─────────────────────────────────────────────
  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 2) {
      lista.innerHTML = '';
      lista.style.display = 'none';
      panel.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(() => realizarBusqueda(query), 280);
  });

  async function realizarBusqueda(query) {
    lista.innerHTML = `<li class="loading-overlay"><span class="spinner" style="border-color: rgba(79,70,229,0.3); border-top-color: #4f46e5;"></span> Buscando...</li>`;
    lista.style.display = 'block';

    const { data } = await buscarCalle(query);

    if (!data || data.length === 0) {
      lista.innerHTML = `<li style="padding:14px 16px; color:#64748b; font-size:0.9rem;">Sin resultados para "<strong>${query}</strong>"</li>`;
      return;
    }

    lista.innerHTML = data.map(c => `
      <li class="item-calle" data-calle='${JSON.stringify(c).replace(/'/g, '&apos;')}'>
        <span class="calle-icon">🛣️</span>
        <strong>${c.nombre}</strong>
      </li>
    `).join('');

    lista.querySelectorAll('.item-calle').forEach(item => {
      item.addEventListener('click', () => seleccionarCalle(JSON.parse(item.dataset.calle)));
    });
  }

  function seleccionarCalle(calle) {
    lista.style.display = 'none';
    input.value = calle.nombre;
    input.blur();

    limpiarCapas(map);

    // Dibujar ruta combinada
    if (calle.ruta_combinada && calle.ruta_combinada.length > 0) {
      const latLngs = calle.ruta_combinada.map(c => [c[1], c[0]]);
      rutaPolyline = L.polyline(latLngs, { color: '#4f46e5', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(rutaPolyline.getBounds(), { padding: [40, 40] });
    }

    // Dibujar marcadores de puntos individuales
    if (calle.puntos && calle.puntos.length > 0) {
      calle.puntos.forEach(p => {
        const marker = L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<strong>${calle.nombre}</strong>`);
        marcadoresPuntos.push(marker);
      });
      if (!calle.ruta_combinada || calle.ruta_combinada.length === 0) {
        const group = L.featureGroup(marcadoresPuntos);
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
      }
    }

    // Panel de info
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.innerHTML = `
      <span class="calle-title">🛣️ ${calle.nombre}</span>
      <button class="btn-maps" id="btn-gmaps">
        🗺️ Abrir en Google Maps
      </button>
      <button class="btn-cerrar" id="btn-cerrar">✕ Cerrar</button>
    `;

    panel.querySelector('#btn-gmaps').onclick = () => {
      let url;
      if (calle.enlaces && calle.enlaces.length > 0) {
        url = calle.enlaces[0];
      } else if (calle.puntos && calle.puntos.length > 0) {
        const p = calle.puntos[0];
        url = `https://www.google.com/maps?q=${p.lat},${p.lng}`;
      } else {
        url = `https://www.google.com/maps/search/${encodeURIComponent(calle.nombre)}`;
      }
      window.open(url, '_blank');
    };

    panel.querySelector('#btn-cerrar').onclick = () => {
      limpiarCapas(map);
      panel.style.display = 'none';
      input.value = '';
    };
  }

  container.querySelector('#settings-btn').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
  };
}

function limpiarCapas(map) {
  if (rutaPolyline) { map.removeLayer(rutaPolyline); rutaPolyline = null; }
  marcadoresPuntos.forEach(m => map.removeLayer(m));
  marcadoresPuntos = [];
}
