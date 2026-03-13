import { crearMapa, agregarMarcador } from '../utils/map';
import { supabase } from '../api/supabase';
import { normalizarCalle } from '../utils/normalizer';

export function renderAdminPanel(container) {
  container.innerHTML = `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto; height: 100%; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2>Panel Admin</h2>
        <button id="logout-adm" class="btn-exit">Salir</button>
      </div>
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h3>Nueva Calle</h3>
        <form id="form-admin">
          <input type="text" id="adm-nombre" placeholder="Nombre de la calle" required style="width:100%; padding:10px; margin-bottom:10px;">
          <div id="map" style="height: 300px; border-radius: 8px; margin: 10px 0;"></div>
          <p><small>Toca el mapa para:</small></p>
          <ul style="margin:5px 0 10px 20px; font-size:0.9em;">
            <li><strong>Modo normal:</strong> selecciona un punto único para la calle.</li>
            <li><strong>Modo ruta:</strong> usa los botones "Punto A" y "Punto B" para marcar inicio y fin, luego "Trazar ruta".</li>
          </ul>
          <div style="display: flex; gap: 10px; margin: 10px 0;">
            <button type="button" id="btn-puntoA" class="btn-secondary" style="flex:1;">📍 Punto A</button>
            <button type="button" id="btn-puntoB" class="btn-secondary" style="flex:1;">📍 Punto B</button>
          </div>
          <button type="button" id="btn-trazar" class="btn-primary" style="margin-bottom:10px;">🛤️ Trazar ruta</button>
          <div id="info-ruta" style="font-size:0.9em; color:#666; margin-bottom:10px;"></div>
          <input type="hidden" id="adm-lat">
          <input type="hidden" id="adm-lng">
          <input type="url" id="adm-link" placeholder="Link de Google Maps (opcional)" style="width:100%; padding:10px; margin-bottom:10px;">
          <input type="hidden" id="adm-ruta">
          <button type="submit" class="btn-primary">Guardar Calle</button>
        </form>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button id="go-search" class="btn-secondary" style="flex:1;">🔍 Buscador</button>
          <button id="btn-gestionar" class="btn-secondary" style="flex:1;">✏️ Gestionar Calles</button>
        </div>
      </div>
    </div>
  `;

  const map = crearMapa('map');
  let markerUnico = null;        // Marcador para punto único
  let markerA = null, markerB = null;
  let puntoA = null, puntoB = null;
  let rutaPolyline = null;
  let modo = null; // 'A' o 'B' o null

  // Información para el usuario
  const infoDiv = container.querySelector('#info-ruta');

  // Botones de modo
  container.querySelector('#btn-puntoA').onclick = () => {
    modo = 'A';
    infoDiv.innerText = 'Modo: Haz clic en el mapa para marcar Punto A';
  };
  container.querySelector('#btn-puntoB').onclick = () => {
    modo = 'B';
    infoDiv.innerText = 'Modo: Haz clic en el mapa para marcar Punto B';
  };

  // Click en el mapa
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (modo === 'A') {
      // Punto A
      if (markerA) map.removeLayer(markerA);
      markerA = L.marker([lat, lng]).addTo(map).bindPopup('Punto A').openPopup();
      puntoA = { lat, lng };
      modo = null;
      infoDiv.innerText = 'Punto A marcado. Ahora marca Punto B o traza la ruta.';
    } else if (modo === 'B') {
      // Punto B
      if (markerB) map.removeLayer(markerB);
      markerB = L.marker([lat, lng]).addTo(map).bindPopup('Punto B').openPopup();
      puntoB = { lat, lng };
      modo = null;
      infoDiv.innerText = 'Puntos A y B listos. Puedes trazar la ruta.';
    } else {
      // Modo normal: punto único para la calle
      container.querySelector('#adm-lat').value = lat;
      container.querySelector('#adm-lng').value = lng;
      if (markerUnico) map.removeLayer(markerUnico);
      markerUnico = L.marker([lat, lng]).addTo(map).bindPopup('Ubicación de la calle').openPopup();
      // Limpiar datos de ruta si los hubiera
      container.querySelector('#adm-ruta').value = '';
      if (rutaPolyline) map.removeLayer(rutaPolyline);
      rutaPolyline = null;
      if (markerA) map.removeLayer(markerA);
      if (markerB) map.removeLayer(markerB);
      markerA = markerB = null;
      puntoA = puntoB = null;
      infoDiv.innerText = 'Punto único seleccionado.';
    }
  });

  // Botón Trazar ruta
  container.querySelector('#btn-trazar').onclick = async () => {
    if (!puntoA || !puntoB) {
      alert('Debes marcar ambos puntos (A y B) antes de trazar la ruta.');
      return;
    }

    infoDiv.innerText = 'Trazando ruta...';

    // Llamada a OSRM (público)
    const url = `https://router.project-osrm.org/route/v1/driving/${puntoA.lng},${puntoA.lat};${puntoB.lng},${puntoB.lat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates; // array de [lng, lat]
        // Guardar en el campo oculto como JSON string
        container.querySelector('#adm-ruta').value = JSON.stringify(coords);

        // Dibujar polyline en el mapa
        if (rutaPolyline) map.removeLayer(rutaPolyline);
        const latLngs = coords.map(c => [c[1], c[0]]); // convertir a [lat, lng]
        rutaPolyline = L.polyline(latLngs, { color: 'blue', weight: 5 }).addTo(map);
        map.fitBounds(rutaPolyline.getBounds());

        // Limpiar marcadores de puntos si se desea (opcional)
        // map.removeLayer(markerA); map.removeLayer(markerB);
        infoDiv.innerText = 'Ruta trazada correctamente.';
      } else {
        alert('No se pudo obtener la ruta. Intenta con otros puntos.');
        infoDiv.innerText = 'Error al trazar ruta.';
      }
    } catch (error) {
      alert('Error al conectar con el servicio de rutas: ' + error.message);
      infoDiv.innerText = 'Error de conexión.';
    }
  };

  // Logout
  container.querySelector('#logout-adm').onclick = () => supabase.auth.signOut();

  // Botón Buscador (navega a la vista de usuario con rol admin)
  container.querySelector('#go-search').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'user', rol: 'admin' } }));
  };

  // Botón Gestionar Calles
  container.querySelector('#btn-gestionar').onclick = () => {
    renderGestionCalles(container);
  };

  // Envío del formulario
  container.querySelector('#form-admin').onsubmit = async (e) => {
    e.preventDefault();

    const nombre = normalizarCalle(container.querySelector('#adm-nombre').value);
    const lat = container.querySelector('#adm-lat').value;
    const lng = container.querySelector('#adm-lng').value;
    const link = container.querySelector('#adm-link').value;
    const rutaJson = container.querySelector('#adm-ruta').value;

    // Validación: debe tener al menos un punto o un link
    if (!link && !lat && !lng && !rutaJson) {
      return alert('Debes proporcionar un link, un punto en el mapa o una ruta.');
    }

    // Parsear ruta si existe
    let ruta = null;
    if (rutaJson) {
      try {
        ruta = JSON.parse(rutaJson);
      } catch (err) {
        return alert('La ruta guardada no es válida.');
      }
    }

    const { error } = await supabase.from('calles').insert([{
      nombre,
      latitud: lat || null,
      longitud: lng || null,
      enlace_google_maps: link || null,
      ruta_json: ruta,  // se guarda como JSONB
      estado: 'aprobado'
    }]);

    if (!error) {
      alert('¡Calle guardada correctamente!');
      // Recargar el panel para limpiar el formulario
      renderAdminPanel(container);
    } else {
      alert('Error al guardar: ' + error.message);
    }
  };
}

// Función auxiliar para la gestión de calles (sin cambios relevantes)
async function renderGestionCalles(container) {
  container.innerHTML = `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto; height: 100%; overflow-y: auto;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <button id="back-adm-from-list" class="btn-link" style="background:none; border:none; color:#007bff; cursor:pointer;">← Volver</button>
        <h3 style="margin:0;">Editar Calles</h3>
      </div>
      <div id="lista-gestion" style="background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-height: 70vh; overflow-y: auto;">
        <p>Cargando calles...</p>
      </div>
    </div>
  `;

  container.querySelector('#back-adm-from-list').onclick = () => renderAdminPanel(container);

  const { data: calles, error } = await supabase.from('calles').select('*').order('nombre', { ascending: true });
  const contenedor = container.querySelector('#lista-gestion');

  if (error || !calles) {
    contenedor.innerHTML = "<p>Error al cargar.</p>";
    return;
  }

  contenedor.innerHTML = calles.map(c => `
    <div style="display: flex; gap: 5px; margin-bottom: 10px; align-items: center;">
      <input type="text" value="${c.nombre}" id="name-${c.id}" style="flex: 1; padding: 8px;">
      <button class="btn-save btn-primary" data-id="${c.id}" style="width: auto; padding: 8px 12px; margin: 0;">💾</button>
      <button class="btn-delete btn-exit" data-id="${c.id}" style="width: auto; padding: 8px 12px; margin: 0;">🗑️</button>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-save').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nuevoNombre = container.querySelector(`#name-${id}`).value;
      const { error } = await supabase.from('calles').update({ nombre: normalizarCalle(nuevoNombre) }).eq('id', id);
      if (!error) alert("¡Nombre actualizado!");
      else alert('Error: ' + error.message);
    };
  });

  contenedor.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("¿Seguro que quieres borrar esta calle?")) return;
      const { error } = await supabase.from('calles').delete().eq('id', btn.dataset.id);
      if (!error) renderGestionCalles(container);
      else alert('Error: ' + error.message);
    };
  });
}
