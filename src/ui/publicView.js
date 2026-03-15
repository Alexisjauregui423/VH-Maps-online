// ui/publicView.js
import L from 'leaflet';
import { crearMapa, agregarControlGeolocalizacion, dibujarCapaCalles } from '../utils/map';
import { buscarCalle, obtenerTodasCalles }                              from '../api/busqueda';
import { mostrarToast }                                                 from '../utils/toast';

let rutaPolyline     = null;
let marcadoresPuntos = [];
let capaCallesBase   = null;   // capa de fondo — nunca se limpia al seleccionar

export function renderPublicView(container) {
  document.body.classList.add('map-view');

  container.innerHTML = `
    <div class="map-wrapper">
      <div id="map"></div>
      <div class="map-overlay">

        <div class="map-header">
          <h2>📍 VH-Maps</h2>
          <button id="settings-btn" class="btn-link"
            style="width:auto;padding:4px 8px;font-size:1.4rem;text-decoration:none;">⚙️</button>
        </div>

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

        <ul id="lista-coincidencias" class="lista-sugerencias" style="display:none;"></ul>
        <div id="calle-panel" class="calle-info-panel" style="display:none;"></div>

      </div>
    </div>
  `;

  const map   = crearMapa('map', 21.678470, -102.588384, 15);
  const input = container.querySelector('#input-busqueda');
  const lista = container.querySelector('#lista-coincidencias');
  const panel = container.querySelector('#calle-panel');

  agregarControlGeolocalizacion(map);

  // ── Capa base de calles (no bloquea el render inicial) ─────────────────────
  obtenerTodasCalles().then(calles => {
    try { capaCallesBase = dibujarCapaCalles(map, calles); }
    catch { /* mapa destruido antes de resolver */ }
  });

  // ── Click en mapa → limpiar selección ─────────────────────────────────────
  map.on('click', () => {
    limpiarSeleccion(map);
    panel.style.display = 'none';
    lista.style.display = 'none';
  });

  // ── Búsqueda con debounce ──────────────────────────────────────────────────
  let debTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debTimer);
    const q = e.target.value.trim();

    if (q.length < 2) {
      lista.innerHTML = '';
      lista.style.display = 'none';
      panel.style.display = 'none';
      return;
    }
    debTimer = setTimeout(() => realizarBusqueda(q), 280);
  });

  async function realizarBusqueda(query) {
    lista.innerHTML    = `<li class="loading-overlay">
      <span class="spinner" style="border-color:rgba(79,70,229,0.3);border-top-color:#4f46e5;"></span>
      Buscando...
    </li>`;
    lista.style.display = 'block';

    const { data } = await buscarCalle(query);

    if (!data?.length) {
      lista.innerHTML = `<li style="padding:14px 16px;color:#64748b;font-size:0.9rem;">
        Sin resultados para "<strong>${query}</strong>"
      </li>`;
      return;
    }

    lista.innerHTML = data.map(c => `
      <li class="item-calle" data-calle='${JSON.stringify(c).replace(/'/g, '&apos;')}'>
        <span class="calle-icon">🛣️</span>
        <strong>${c.nombre}</strong>
      </li>
    `).join('');

    lista.querySelectorAll('.item-calle').forEach(item => {
      item.addEventListener('click', () =>
        seleccionarCalle(JSON.parse(item.dataset.calle)));
    });
  }

  function seleccionarCalle(calle) {
    lista.style.display = 'none';
    input.value = calle.nombre;
    input.blur();

    limpiarSeleccion(map);

    // Dibujar la calle seleccionada en indigo (encima de la capa base)
    if (calle.ruta_combinada?.length) {
      const latLngs = calle.ruta_combinada.map(p => [p[1], p[0]]);
      rutaPolyline = L.polyline(latLngs, { color: '#4f46e5', weight: 5, opacity: 0.9 }).addTo(map);
      map.fitBounds(rutaPolyline.getBounds(), { padding: [40, 40] });
    }

    if (calle.puntos?.length) {
      calle.puntos.forEach(p => {
        const m = L.marker([p.lat, p.lng]).addTo(map)
          .bindPopup(`<strong>${calle.nombre}</strong>`);
        marcadoresPuntos.push(m);
      });
      if (!calle.ruta_combinada?.length) {
        map.fitBounds(L.featureGroup(marcadoresPuntos).getBounds(), { padding: [40, 40] });
      }
    }

    // Panel de info
    panel.style.display       = 'flex';
    panel.style.flexDirection = 'column';
    panel.innerHTML = `
      <span class="calle-title">🛣️ ${calle.nombre}</span>
      <button class="btn-maps" id="btn-gmaps">🗺️ Abrir en Google Maps</button>
      <button class="btn-cerrar" id="btn-cerrar">✕ Cerrar</button>
    `;

    panel.querySelector('#btn-gmaps').onclick = () => {
      let url;
      if (calle.enlaces?.length)     url = calle.enlaces[0];
      else if (calle.puntos?.length) url = `https://www.google.com/maps?q=${calle.puntos[0].lat},${calle.puntos[0].lng}`;
      else                           url = `https://www.google.com/maps/search/${encodeURIComponent(calle.nombre)}`;
      window.open(url, '_blank');
    };

    panel.querySelector('#btn-cerrar').onclick = () => {
      limpiarSeleccion(map);
      panel.style.display = 'none';
      input.value = '';
    };
  }

  container.querySelector('#settings-btn').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
  };
}

// Solo limpia la selección activa — capaCallesBase nunca se toca
function limpiarSeleccion(map) {
  if (rutaPolyline) { map.removeLayer(rutaPolyline); rutaPolyline = null; }
  marcadoresPuntos.forEach(m => map.removeLayer(m));
  marcadoresPuntos = [];
}
