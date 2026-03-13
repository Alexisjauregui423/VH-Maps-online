import { crearMapa, agregarControlGeolocalizacion, agregarMarcador } from '../utils/map';
import { buscarCalle } from '../api/busqueda';

let rutaPolyline = null;
let marcadoresPuntos = []; // Para guardar marcadores de puntos individuales

export function renderPublicView(container) {
  container.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%;">
      <div id="map" style="width: 100%; height: 100%;"></div>
      <div style="position: absolute; top: 10px; left: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.95); padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); pointer-events: auto;">
          <h2 style="margin:0; font-size: 1.5rem;">VH-Maps</h2>
          <button id="settings-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; padding: 0 5px;">⚙️</button>
        </div>
        <input type="text" id="input-busqueda" placeholder="Buscar calle o tramo..." style="width:100%; padding:12px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.1); pointer-events: auto; font-size: 16px;">
        <ul id="lista-coincidencias" class="lista-sugerencias" style="pointer-events: auto; max-height: 200px; overflow-y: auto;"></ul>
      </div>
    </div>
  `;

  const map = crearMapa('map', 21.6245, -102.6015, 15);
  agregarControlGeolocalizacion(map);

  const input = container.querySelector('#input-busqueda');
  const lista = container.querySelector('#lista-coincidencias');

  input.oninput = async (e) => {
    const query = e.target.value;
    if (query.length < 2) {
      lista.innerHTML = '';
      return;
    }

    const { data } = await buscarCalle(query);
    lista.innerHTML = (data || []).map(c => `
      <li class="item-calle" data-calle='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
        <strong>${c.nombre}</strong>
      </li>
    `).join('');

    container.querySelectorAll('.item-calle').forEach(item => {
      item.onclick = () => {
        const calle = JSON.parse(item.dataset.calle);
        
        // Limpiar capas anteriores
        if (rutaPolyline) {
          map.removeLayer(rutaPolyline);
          rutaPolyline = null;
        }
        marcadoresPuntos.forEach(m => map.removeLayer(m));
        marcadoresPuntos = [];

        // Dibujar ruta combinada si existe
        if (calle.ruta_combinada && calle.ruta_combinada.length > 0) {
          const latLngs = calle.ruta_combinada.map(c => [c[1], c[0]]); // [lng, lat] -> [lat, lng]
          rutaPolyline = L.polyline(latLngs, { color: 'blue', weight: 5 }).addTo(map);
          map.fitBounds(rutaPolyline.getBounds());
        }

        // Dibujar puntos individuales como marcadores
        if (calle.puntos && calle.puntos.length > 0) {
          calle.puntos.forEach(p => {
            const marker = L.marker([p.lat, p.lng]).addTo(map)
              .bindPopup(calle.nombre);
            marcadoresPuntos.push(marker);
          });
          // Si no hay ruta, ajustar vista a los puntos
          if (!calle.ruta_combinada || calle.ruta_combinada.length === 0) {
            const group = L.featureGroup(marcadoresPuntos);
            map.fitBounds(group.getBounds());
          }
        }

        // Mostrar botón para abrir en Google Maps (usando el primer enlace o coordenadas)
        lista.innerHTML = '';
        const btnGPS = document.createElement('button');
        btnGPS.className = "btn-primary";
        btnGPS.innerText = "Abrir en Google Maps";
        btnGPS.onclick = () => {
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
        lista.appendChild(btnGPS);
      };
    });
  };

  container.querySelector('#settings-btn').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
  };
}
