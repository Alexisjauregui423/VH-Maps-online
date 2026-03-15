// ui/adminView.js
import L from 'leaflet';
import { crearMapa } from '../utils/map';
import { supabase } from '../api/supabase';
import { normalizarCalle } from '../utils/normalizer';
import { mostrarToast } from '../utils/toast';

// ─────────────────────────────────────────────────────────────────────────────
// PANEL PRINCIPAL — Tabs de navegación
// ─────────────────────────────────────────────────────────────────────────────
export function renderAdminPanel(container) {
  document.body.classList.remove('map-view');

  container.innerHTML = `
    <div class="admin-wrapper">

      <div class="admin-header">
        <h2>🛡️ Panel Admin</h2>
        <button id="logout-adm" class="btn-exit">Salir</button>
      </div>

      <!-- Tabs -->
      <div class="admin-tabs">
        <button class="tab-btn active" data-tab="nueva">📝 Nueva</button>
        <button class="tab-btn" data-tab="gestionar">✏️ Calles</button>
        <button class="tab-btn" data-tab="direcciones">
          📋 Reportes
          <span id="badge-pendientes" style="
            display:none; background:#ef4444; color:#fff;
            font-size:0.65rem; font-weight:700; padding:1px 5px;
            border-radius:10px; margin-left:3px; vertical-align:middle;
          "></span>
        </button>
        <button class="tab-btn" data-tab="buscador">🔍 Mapa</button>
      </div>

      <!-- Contenido de tabs -->
      <div id="tab-content"></div>
    </div>
  `;

  // Inyectar estilos de tabs (complementan style.css)
  if (!document.getElementById('admin-tab-styles')) {
    const s = document.createElement('style');
    s.id = 'admin-tab-styles';
    s.textContent = `
      .admin-tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 16px;
        background: #e2e8f0;
        padding: 4px;
        border-radius: 10px;
      }
      .tab-btn {
        flex: 1;
        padding: 9px 6px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        background: transparent;
        color: #64748b;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .tab-btn.active {
        background: #fff;
        color: #4f46e5;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      }
      .modo-btn {
        flex: 1;
        padding: 9px 8px;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        background: #f1f5f9;
        color: #475569;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s;
      }
      .modo-btn.active {
        background: #e0e7ff;
        color: #4f46e5;
        border-color: #a5b4fc;
      }
      .campo-label {
        display: block;
        font-size: 0.82rem;
        font-weight: 600;
        color: #374151;
        margin: 10px 0 3px;
      }
      .gestion-calle-item {
        background: #fff;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
      }
      .gestion-calle-item:hover { border-color: #a5b4fc; background: #f8f8ff; }
      .gestion-calle-item .nombre { font-weight: 600; font-size: 0.95rem; }
      .gestion-calle-item .estado-chip {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 20px;
      }
      .estado-chip.aprobado  { background: #d1fae5; color: #065f46; }
      .estado-chip.pendiente { background: #fef3c7; color: #92400e; }
      .estado-chip.rechazado { background: #fee2e2; color: #991b1b; }
      .divider { height: 1px; background: #e2e8f0; margin: 14px 0; }
      .dir-item {
        background: #fff; border: 1.5px solid #e2e8f0;
        border-radius: 12px; padding: 14px; margin-bottom: 10px;
      }
      .dir-item.pendiente { border-left: 4px solid #f59e0b; }
      .dir-item.aprobado  { border-left: 4px solid #16a34a; }
      .dir-item.rechazado { border-left: 4px solid #dc3545; }
      .dir-item-header {
        display: flex; justify-content: space-between;
        align-items: flex-start; gap: 8px; margin-bottom: 8px;
      }
      .dir-item-actions { display: flex; gap: 8px; margin-top: 10px; }
      .btn-aprobar {
        flex:1; padding:8px; border:none; border-radius:8px;
        background:#d1fae5; color:#065f46; font-weight:700;
        font-size:0.85rem; cursor:pointer; font-family:inherit; transition:background 0.15s;
      }
      .btn-aprobar:hover { background:#a7f3d0; }
      .btn-rechazar {
        flex:1; padding:8px; border:none; border-radius:8px;
        background:#fee2e2; color:#991b1b; font-weight:700;
        font-size:0.85rem; cursor:pointer; font-family:inherit; transition:background 0.15s;
      }
      .btn-rechazar:hover { background:#fecaca; }
      .btn-ver-mapa {
        padding:8px 12px; border:none; border-radius:8px;
        background:#e0e7ff; color:#4f46e5; font-weight:700;
        font-size:0.85rem; cursor:pointer; font-family:inherit;
        transition:background 0.15s; white-space:nowrap;
      }
      .btn-ver-mapa:hover { background:#c7d2fe; }
      .filtro-tabs { display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
      .filtro-btn {
        padding:6px 14px; border-radius:20px; border:1.5px solid #e2e8f0;
        background:#f8fafc; color:#64748b; font-size:0.8rem; font-weight:600;
        cursor:pointer; font-family:inherit; transition:all 0.15s;
      }
      .filtro-btn.active { background:#4f46e5; color:#fff; border-color:#4f46e5; }
    `;
    document.head.appendChild(s);
  }

  container.querySelector('#logout-adm').onclick = () => supabase.auth.signOut();

  // Cargar badge de pendientes al iniciar
  cargarBadgePendientes();

  async function cargarBadgePendientes() {
    const { count } = await supabase
      .from('direcciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');

    const badge = container.querySelector('#badge-pendientes');
    if (badge && count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline';
    }
  }

  // Tab click
  const tabContent = container.querySelector('#tab-content');
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'nueva')        renderNuevaCalle(tabContent, container);
      if (tab === 'gestionar')    renderGestionCalles(tabContent, container);
      if (tab === 'direcciones')  renderAprobacionDirecciones(tabContent, container, cargarBadgePendientes);
      if (tab === 'buscador')  {
        window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'user', rol: 'admin' } }));
      }
    });
  });

  // Mostrar tab inicial
  renderNuevaCalle(tabContent, container);
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: NUEVA CALLE
// ─────────────────────────────────────────────────────────────────────────────
function renderNuevaCalle(tabContent, rootContainer) {
  tabContent.innerHTML = `
    <div class="card">
      <h3>Nueva Calle</h3>

      <label class="campo-label">Nombre de la calle *</label>
      <input type="text" id="adm-nombre" placeholder="Ej: Calle Hidalgo, Av. Juárez" autocomplete="off">

      <!-- Selector de modo -->
      <label class="campo-label">Modo de registro</label>
      <div style="display:flex; gap:6px; margin-bottom:10px;">
        <button type="button" class="modo-btn active" data-modo="punto">📍 Punto</button>
        <button type="button" class="modo-btn" data-modo="osrm">🛤️ Ruta OSRM</button>
        <button type="button" class="modo-btn" data-modo="libre">✏️ Dibujo libre</button>
      </div>

      <!-- Instrucción dinámica -->
      <div id="instruccion" class="info-ruta" style="margin-bottom:8px;">
        📍 Toca el mapa para marcar la ubicación de la calle.
      </div>

      <!-- Mapa -->
      <div id="map-admin" style="height:280px; border-radius:10px; border:2px solid #e2e8f0; margin:8px 0; z-index:1;"></div>

      <!-- Controles OSRM -->
      <div id="controles-osrm" style="display:none;">
        <div class="btn-group" style="margin-bottom:6px;">
          <button type="button" id="btn-puntoA" class="btn-secondary">📍 Punto A</button>
          <button type="button" id="btn-puntoB" class="btn-secondary">📍 Punto B</button>
        </div>
        <button type="button" id="btn-trazar" class="btn-primary" style="margin:0 0 6px;">🛤️ Trazar ruta automática</button>
      </div>

      <!-- Controles Dibujo libre -->
      <div id="controles-libre" style="display:none;">
        <p style="font-size:0.82rem; color:#64748b; margin-bottom:6px;">
          Toca el mapa para agregar puntos uno a uno. Mínimo 2 puntos para guardar.
        </p>
        <div class="btn-group">
          <button type="button" id="btn-deshacer" class="btn-secondary">↩ Deshacer</button>
          <button type="button" id="btn-limpiar-libre" class="btn-exit" style="flex:1;">🗑 Limpiar</button>
        </div>
        <div id="contador-puntos" style="font-size:0.82rem; color:#64748b; margin-top:6px; text-align:center;">
          0 puntos agregados
        </div>
      </div>

      <div class="divider"></div>

      <label class="campo-label">Link Google Maps (opcional)</label>
      <input type="url" id="adm-link" placeholder="https://maps.app.goo.gl/...">

      <!-- Campos ocultos -->
      <input type="hidden" id="adm-lat">
      <input type="hidden" id="adm-lng">
      <input type="hidden" id="adm-ruta">

      <button type="button" id="btn-guardar-calle" class="btn-primary" style="margin-top:14px;">
        💾 Guardar Calle
      </button>
    </div>
  `;

  const map = crearMapa('map-admin');

  // ── Estado del formulario ────────────────────────────────────────────────
  let modoActivo   = 'punto';   // 'punto' | 'osrm' | 'libre'
  let markerUnico  = null;
  let markerA      = null, markerB      = null;
  let puntoA       = null, puntoB       = null;
  let rutaPolyline = null;
  let modoOsrm     = null;      // 'A' | 'B' | null

  // Dibujo libre
  let puntosLibres   = [];
  let markersLibres  = [];
  let polylineLibre  = null;

  const instruccion = tabContent.querySelector('#instruccion');

  // ── Helpers ──────────────────────────────────────────────────────────────
  function limpiarTodo() {
    [markerUnico, markerA, markerB].forEach(m => { if (m) map.removeLayer(m); });
    markerUnico = markerA = markerB = null;
    puntoA = puntoB = null;
    if (rutaPolyline) { map.removeLayer(rutaPolyline); rutaPolyline = null; }
    limpiarLibre();
    tabContent.querySelector('#adm-lat').value   = '';
    tabContent.querySelector('#adm-lng').value   = '';
    tabContent.querySelector('#adm-ruta').value  = '';
  }

  function limpiarLibre() {
    markersLibres.forEach(m => map.removeLayer(m));
    markersLibres = [];
    puntosLibres  = [];
    if (polylineLibre) { map.removeLayer(polylineLibre); polylineLibre = null; }
    actualizarContador();
  }

  function actualizarContador() {
    const el = tabContent.querySelector('#contador-puntos');
    if (el) el.textContent = `${puntosLibres.length} punto${puntosLibres.length !== 1 ? 's' : ''} agregado${puntosLibres.length !== 1 ? 's' : ''}`;
  }

  function dibujarPolylineLibre() {
    if (polylineLibre) map.removeLayer(polylineLibre);
    if (puntosLibres.length >= 2) {
      polylineLibre = L.polyline(puntosLibres, { color: '#4f46e5', weight: 5, opacity: 0.85 }).addTo(map);
    }
  }

  function activarModo(modo) {
    modoActivo = modo;
    limpiarTodo();
    modoOsrm = null;

    // Actualizar botones
    tabContent.querySelectorAll('.modo-btn').forEach(b => b.classList.toggle('active', b.dataset.modo === modo));

    // Mostrar/ocultar controles
    tabContent.querySelector('#controles-osrm').style.display  = modo === 'osrm'  ? 'block' : 'none';
    tabContent.querySelector('#controles-libre').style.display = modo === 'libre' ? 'block' : 'none';

    const instrucciones = {
      punto: '📍 Toca el mapa para marcar la ubicación de la calle.',
      osrm:  '🛤️ Presiona "Punto A" y "Punto B", márcalos en el mapa, luego traza la ruta.',
      libre: '✏️ Toca el mapa para ir agregando puntos uno a uno y trazar la calle.',
    };
    instruccion.textContent = instrucciones[modo];
  }

  // ── Selector de modo ─────────────────────────────────────────────────────
  tabContent.querySelectorAll('.modo-btn').forEach(btn => {
    btn.addEventListener('click', () => activarModo(btn.dataset.modo));
  });

  // ── Click en el mapa ─────────────────────────────────────────────────────
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (modoActivo === 'punto') {
      if (markerUnico) map.removeLayer(markerUnico);
      markerUnico = L.marker([lat, lng]).addTo(map).bindPopup('📍 Ubicación').openPopup();
      tabContent.querySelector('#adm-lat').value  = lat;
      tabContent.querySelector('#adm-lng').value  = lng;
      tabContent.querySelector('#adm-ruta').value = '';
      instruccion.textContent = `✅ Punto marcado: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    else if (modoActivo === 'osrm') {
      if (modoOsrm === 'A') {
        if (markerA) map.removeLayer(markerA);
        markerA = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<div style="background:#16a34a;color:#fff;font-weight:700;padding:3px 7px;border-radius:6px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">A</div>' })
        }).addTo(map);
        puntoA = { lat, lng };
        modoOsrm = null;
        instruccion.textContent = '✅ Punto A marcado. Ahora selecciona Punto B.';
      } else if (modoOsrm === 'B') {
        if (markerB) map.removeLayer(markerB);
        markerB = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<div style="background:#dc3545;color:#fff;font-weight:700;padding:3px 7px;border-radius:6px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>' })
        }).addTo(map);
        puntoB = { lat, lng };
        modoOsrm = null;
        instruccion.textContent = '✅ Puntos A y B listos. Presiona "Trazar ruta automática".';
      }
    }

    else if (modoActivo === 'libre') {
      puntosLibres.push([lat, lng]);
      const marker = L.circleMarker([lat, lng], {
        radius: 5, color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1, weight: 2
      }).addTo(map);
      markersLibres.push(marker);
      dibujarPolylineLibre();
      actualizarContador();
      // Guardar en campo oculto en tiempo real
      const coords = puntosLibres.map(([lt, ln]) => [ln, lt]); // [lat,lng] → [lng,lat] para consistencia con OSRM
      tabContent.querySelector('#adm-ruta').value = JSON.stringify(coords);
      tabContent.querySelector('#adm-lat').value  = puntosLibres[0][0];
      tabContent.querySelector('#adm-lng').value  = puntosLibres[0][1];
    }
  });

  // ── Controles OSRM ───────────────────────────────────────────────────────
  tabContent.querySelector('#btn-puntoA').addEventListener('click', () => {
    modoOsrm = 'A';
    instruccion.textContent = '🟢 Toca el mapa para marcar el Punto A (inicio).';
    tabContent.querySelector('#btn-puntoA').style.borderColor = '#16a34a';
    tabContent.querySelector('#btn-puntoB').style.borderColor = '';
  });

  tabContent.querySelector('#btn-puntoB').addEventListener('click', () => {
    modoOsrm = 'B';
    instruccion.textContent = '🔴 Toca el mapa para marcar el Punto B (fin).';
    tabContent.querySelector('#btn-puntoB').style.borderColor = '#dc3545';
    tabContent.querySelector('#btn-puntoA').style.borderColor = '';
  });

  tabContent.querySelector('#btn-trazar').addEventListener('click', () => trazarOsrm(false));

  async function trazarOsrm(esEdicion = false) {
    if (!puntoA || !puntoB) {
      mostrarToast('Marca Punto A y Punto B antes de trazar', 'warning');
      return;
    }
    instruccion.textContent = '⏳ Trazando ruta...';
    tabContent.querySelector('#btn-trazar').disabled = true;

    const url = `https://router.project-osrm.org/route/v1/driving/${puntoA.lng},${puntoA.lat};${puntoB.lng},${puntoB.lat}?overview=full&geometries=geojson`;

    try {
      const res  = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords  = data.routes[0].geometry.coordinates; // [lng, lat]
        const latLngs = coords.map(c => [c[1], c[0]]);

        if (rutaPolyline) map.removeLayer(rutaPolyline);
        rutaPolyline = L.polyline(latLngs, { color: '#4f46e5', weight: 5, opacity: 0.85 }).addTo(map);
        map.fitBounds(rutaPolyline.getBounds(), { padding: [30, 30] });

        const campo = esEdicion
          ? document.querySelector('#edit-adm-ruta')
          : tabContent.querySelector('#adm-ruta');
        if (campo) campo.value = JSON.stringify(coords);
        instruccion.textContent = `✅ Ruta trazada (${coords.length} puntos).`;
      } else {
        mostrarToast('No se pudo trazar la ruta. Prueba otros puntos.', 'error');
        instruccion.textContent = '❌ Error al trazar. Intenta con otros puntos.';
      }
    } catch (err) {
      mostrarToast('Error de conexión con OSRM', 'error');
      instruccion.textContent = '❌ Error de conexión.';
    } finally {
      tabContent.querySelector('#btn-trazar').disabled = false;
    }
  }

  // ── Controles Dibujo libre ────────────────────────────────────────────────
  tabContent.querySelector('#btn-deshacer').addEventListener('click', () => {
    if (puntosLibres.length === 0) return;
    puntosLibres.pop();
    const lastMarker = markersLibres.pop();
    if (lastMarker) map.removeLayer(lastMarker);
    dibujarPolylineLibre();
    actualizarContador();
    const coords = puntosLibres.map(([lt, ln]) => [ln, lt]);
    tabContent.querySelector('#adm-ruta').value = puntosLibres.length > 0 ? JSON.stringify(coords) : '';
  });

  tabContent.querySelector('#btn-limpiar-libre').addEventListener('click', () => {
    limpiarLibre();
    tabContent.querySelector('#adm-ruta').value = '';
    tabContent.querySelector('#adm-lat').value  = '';
    tabContent.querySelector('#adm-lng').value  = '';
  });

  // ── Guardar ──────────────────────────────────────────────────────────────
  tabContent.querySelector('#btn-guardar-calle').addEventListener('click', async () => {
    const nombreRaw = tabContent.querySelector('#adm-nombre').value.trim();
    const lat       = tabContent.querySelector('#adm-lat').value;
    const lng       = tabContent.querySelector('#adm-lng').value;
    const link      = tabContent.querySelector('#adm-link').value.trim();
    const rutaJson  = tabContent.querySelector('#adm-ruta').value;

    if (!nombreRaw) {
      mostrarToast('El nombre de la calle es obligatorio', 'warning');
      return;
    }
    if (!link && !lat && !rutaJson) {
      mostrarToast('Debes marcar un punto, una ruta o agregar un link', 'warning');
      return;
    }
    if (modoActivo === 'libre' && puntosLibres.length < 2) {
      mostrarToast('El modo dibujo libre necesita al menos 2 puntos', 'warning');
      return;
    }

    let ruta = null;
    if (rutaJson) {
      try { ruta = JSON.parse(rutaJson); } catch { mostrarToast('Ruta inválida', 'error'); return; }
    }

    const btn = tabContent.querySelector('#btn-guardar-calle');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    const nombre = normalizarCalle(nombreRaw);
    const { error } = await supabase.from('calles').insert([{
      nombre,
      latitud:           lat   ? parseFloat(lat)  : null,
      longitud:          lng   ? parseFloat(lng)  : null,
      enlace_google_maps: link  || null,
      ruta_json:         ruta,
      estado:            'aprobado',
    }]);

    if (error) {
      mostrarToast('Error al guardar: ' + error.message, 'error');
    } else {
      mostrarToast('✅ Calle guardada correctamente', 'success');
      // Limpiar formulario
      tabContent.querySelector('#adm-nombre').value = '';
      tabContent.querySelector('#adm-link').value   = '';
      limpiarTodo();
      activarModo('punto');
    }

    btn.disabled  = false;
    btn.innerHTML = '💾 Guardar Calle';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: GESTIONAR CALLES (buscador + lista)
// ─────────────────────────────────────────────────────────────────────────────
function renderGestionCalles(tabContent, rootContainer) {
  tabContent.innerHTML = `
    <div class="card">
      <h3>Gestionar Calles</h3>
      <input
        type="text"
        id="busq-gestion"
        placeholder="🔍 Buscar calle por nombre..."
        autocomplete="off"
        autocorrect="off"
      >
      <p class="text-muted mt-8" style="font-size:0.8rem;">
        Escribe al menos 2 caracteres para buscar.
      </p>
    </div>
    <div id="resultado-gestion"></div>
  `;

  const input      = tabContent.querySelector('#busq-gestion');
  const resultado  = tabContent.querySelector('#resultado-gestion');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();

    if (q.length < 2) {
      resultado.innerHTML = '';
      return;
    }

    resultado.innerHTML = `<div class="loading-overlay"><span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span> Buscando...</div>`;
    timer = setTimeout(() => buscarParaGestion(q, resultado, tabContent, rootContainer), 300);
  });
}

async function buscarParaGestion(query, resultado, tabContent, rootContainer) {
  const { data, error } = await supabase
    .from('calles')
    .select('id, nombre, estado, latitud, longitud, enlace_google_maps, ruta_json, creado_en')
    .ilike('nombre', `%${query}%`)
    .order('nombre', { ascending: true })
    .limit(20);

  if (error || !data) {
    resultado.innerHTML = `<div class="card text-center text-muted">Error al buscar. Intenta de nuevo.</div>`;
    return;
  }

  if (data.length === 0) {
    resultado.innerHTML = `<div class="card text-center text-muted" style="padding:20px;">Sin resultados para "<strong>${query}</strong>"</div>`;
    return;
  }

  resultado.innerHTML = data.map(c => `
    <div class="gestion-calle-item" data-id="${c.id}">
      <div>
        <div class="nombre">${c.nombre}</div>
        <div style="font-size:0.78rem; color:#94a3b8; margin-top:2px;">
          ${c.ruta_json ? `📐 ${c.ruta_json.length} puntos de ruta` : c.latitud ? '📍 Punto único' : '🔗 Solo link'}
        </div>
      </div>
      <span class="estado-chip ${c.estado}">${c.estado}</span>
    </div>
  `).join('');

  resultado.querySelectorAll('.gestion-calle-item').forEach(item => {
    item.addEventListener('click', () => {
      const calle = data.find(c => c.id === item.dataset.id);
      if (calle) renderEditarCalle(tabContent, rootContainer, calle);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITAR CALLE — Página completa con todos los campos + mapa
// ─────────────────────────────────────────────────────────────────────────────
function renderEditarCalle(tabContent, rootContainer, calle) {
  // Serializar ruta_json de forma segura para el HTML
  const rutaStr = calle.ruta_json ? JSON.stringify(calle.ruta_json) : '';
  const rutaPuntos = calle.ruta_json ? calle.ruta_json.length : 0;

  tabContent.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
      <button id="btn-volver-gestion" class="btn-link" style="width:auto; text-decoration:none; font-size:1.2rem; padding:4px 8px;">←</button>
      <h3 style="margin:0; font-size:1.05rem; font-weight:700;">Editando calle</h3>
    </div>

    <!-- Datos básicos -->
    <div class="card">
      <h3>📋 Datos básicos</h3>

      <label class="campo-label">Nombre *</label>
      <input type="text" id="edit-nombre" value="${calle.nombre}" autocomplete="off">

      <label class="campo-label">Estado</label>
      <select id="edit-estado" style="width:100%; padding:11px 14px; margin:6px 0; border:1.5px solid #e2e8f0; border-radius:10px; font-size:1rem; background:#fff; color:#1e293b;">
        <option value="aprobado"  ${calle.estado === 'aprobado'  ? 'selected' : ''}>✅ Aprobado</option>
        <option value="pendiente" ${calle.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
      </select>

      <label class="campo-label">Link Google Maps</label>
      <input type="url" id="edit-link" value="${calle.enlace_google_maps || ''}" placeholder="https://maps.app.goo.gl/...">
    </div>

    <!-- Coordenadas punto -->
    <div class="card">
      <h3>📍 Coordenadas de punto</h3>
      <p class="text-muted" style="margin-bottom:8px;">Coordenadas del punto representativo de la calle (opcional si hay ruta).</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label class="campo-label">Latitud</label>
          <input type="number" id="edit-lat" value="${calle.latitud || ''}" placeholder="21.6245" step="any">
        </div>
        <div>
          <label class="campo-label">Longitud</label>
          <input type="number" id="edit-lng" value="${calle.longitud || ''}" placeholder="-102.6015" step="any">
        </div>
      </div>
    </div>

    <!-- Ruta -->
    <div class="card">
      <h3>🛣️ Ruta</h3>

      <div id="info-ruta-actual" class="info-ruta" style="margin-bottom:10px;">
        ${rutaPuntos > 0
          ? `📐 Ruta actual: <strong>${rutaPuntos} puntos</strong>`
          : '⚠️ Esta calle no tiene ruta guardada.'}
      </div>

      <!-- Mapa de edición -->
      <div id="map-admin" style="height:260px; border-radius:10px; border:2px solid #e2e8f0; margin-bottom:10px; z-index:1;"></div>

      <!-- Selector de modo para re-trazar -->
      <label class="campo-label">Re-trazar ruta con:</label>
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <button type="button" class="modo-btn active" data-modo="osrm">🛤️ OSRM</button>
        <button type="button" class="modo-btn" data-modo="libre">✏️ Dibujo libre</button>
      </div>

      <div id="edit-instruccion" class="info-ruta" style="margin-bottom:8px;">
        🛤️ Selecciona "Punto A" y "Punto B" en el mapa, luego traza.
      </div>

      <!-- Controles OSRM edición -->
      <div id="edit-controles-osrm">
        <div class="btn-group" style="margin-bottom:6px;">
          <button type="button" id="edit-btn-puntoA" class="btn-secondary">📍 Punto A</button>
          <button type="button" id="edit-btn-puntoB" class="btn-secondary">📍 Punto B</button>
        </div>
        <button type="button" id="edit-btn-trazar" class="btn-primary" style="margin:0 0 6px;">🛤️ Trazar ruta automática</button>
      </div>

      <!-- Controles libre edición -->
      <div id="edit-controles-libre" style="display:none;">
        <p style="font-size:0.82rem; color:#64748b; margin-bottom:6px;">Toca el mapa para agregar puntos uno a uno.</p>
        <div class="btn-group">
          <button type="button" id="edit-btn-deshacer" class="btn-secondary">↩ Deshacer</button>
          <button type="button" id="edit-btn-limpiar" class="btn-exit" style="flex:1;">🗑 Limpiar</button>
        </div>
        <div id="edit-contador" style="font-size:0.82rem; color:#64748b; margin-top:6px; text-align:center;">0 puntos</div>
      </div>

      <button type="button" id="edit-btn-limpiar-ruta" class="btn-link" style="color:#dc3545; margin-top:8px; text-decoration:none; font-size:0.85rem;">
        🗑 Eliminar ruta guardada
      </button>

      <input type="hidden" id="edit-adm-ruta" value="${rutaStr.replace(/"/g, '&quot;')}">
    </div>

    <!-- Acciones -->
    <div style="display:flex; gap:10px; margin-top:4px; padding-bottom:20px;">
      <button id="edit-btn-guardar" class="btn-primary" style="flex:3;">💾 Guardar cambios</button>
      <button id="edit-btn-eliminar" class="btn-exit" style="flex:1; padding:12px 8px;">🗑</button>
    </div>
  `;

  // ── Mapa de edición ───────────────────────────────────────────────────────
  const map = crearMapa('map-admin');

  // Mostrar ruta actual si existe
  if (calle.ruta_json && calle.ruta_json.length >= 2) {
    const latLngs = calle.ruta_json.map(c => [c[1], c[0]]);
    const poly = L.polyline(latLngs, { color: '#94a3b8', weight: 4, dashArray: '6 4', opacity: 0.7 }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [30, 30] });
  } else if (calle.latitud && calle.longitud) {
    map.setView([calle.latitud, calle.longitud], 16);
    L.marker([calle.latitud, calle.longitud]).addTo(map).bindPopup(calle.nombre).openPopup();
  }

  // ── Estado edición ────────────────────────────────────────────────────────
  let editModo    = 'osrm';
  let editModoOsrm = null;
  let editMarkerA = null, editMarkerB = null;
  let editPuntoA  = null, editPuntoB  = null;
  let editRutaPoly = null;
  let editPuntosLibres  = [];
  let editMarkersLibres = [];
  let editPolyLibre     = null;

  const editInstruccion = tabContent.querySelector('#edit-instruccion');

  function limpiarEditLibre() {
    editMarkersLibres.forEach(m => map.removeLayer(m));
    editMarkersLibres = [];
    editPuntosLibres  = [];
    if (editPolyLibre) { map.removeLayer(editPolyLibre); editPolyLibre = null; }
    const c = tabContent.querySelector('#edit-contador');
    if (c) c.textContent = '0 puntos';
  }

  function dibujarEditPolyLibre() {
    if (editPolyLibre) map.removeLayer(editPolyLibre);
    if (editPuntosLibres.length >= 2) {
      editPolyLibre = L.polyline(editPuntosLibres, { color: '#4f46e5', weight: 5, opacity: 0.85 }).addTo(map);
    }
  }

  // ── Selector modo edición ─────────────────────────────────────────────────
  tabContent.querySelectorAll('.modo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editModo = btn.dataset.modo;
      tabContent.querySelectorAll('.modo-btn').forEach(b => b.classList.toggle('active', b.dataset.modo === editModo));
      tabContent.querySelector('#edit-controles-osrm').style.display  = editModo === 'osrm'  ? 'block' : 'none';
      tabContent.querySelector('#edit-controles-libre').style.display = editModo === 'libre' ? 'block' : 'none';

      if (editModo === 'osrm')  editInstruccion.textContent = '🛤️ Selecciona "Punto A" y "Punto B" en el mapa, luego traza.';
      if (editModo === 'libre') editInstruccion.textContent = '✏️ Toca el mapa para agregar puntos uno a uno.';

      // Limpiar estado del otro modo
      [editMarkerA, editMarkerB].forEach(m => { if (m) map.removeLayer(m); });
      editMarkerA = editMarkerB = null;
      editPuntoA  = editPuntoB  = null;
      if (editRutaPoly) { map.removeLayer(editRutaPoly); editRutaPoly = null; }
      limpiarEditLibre();
    });
  });

  // ── Click en el mapa ──────────────────────────────────────────────────────
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (editModo === 'osrm') {
      if (editModoOsrm === 'A') {
        if (editMarkerA) map.removeLayer(editMarkerA);
        editMarkerA = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<div style="background:#16a34a;color:#fff;font-weight:700;padding:3px 7px;border-radius:6px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">A</div>' })
        }).addTo(map);
        editPuntoA = { lat, lng };
        editModoOsrm = null;
        editInstruccion.textContent = '✅ Punto A marcado. Ahora marca Punto B.';
      } else if (editModoOsrm === 'B') {
        if (editMarkerB) map.removeLayer(editMarkerB);
        editMarkerB = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<div style="background:#dc3545;color:#fff;font-weight:700;padding:3px 7px;border-radius:6px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">B</div>' })
        }).addTo(map);
        editPuntoB = { lat, lng };
        editModoOsrm = null;
        editInstruccion.textContent = '✅ Puntos A y B listos. Presiona "Trazar ruta automática".';
      }
    } else if (editModo === 'libre') {
      editPuntosLibres.push([lat, lng]);
      const marker = L.circleMarker([lat, lng], {
        radius: 5, color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1, weight: 2
      }).addTo(map);
      editMarkersLibres.push(marker);
      dibujarEditPolyLibre();
      const coords = editPuntosLibres.map(([lt, ln]) => [ln, lt]);
      tabContent.querySelector('#edit-adm-ruta').value = JSON.stringify(coords);
      const c = tabContent.querySelector('#edit-contador');
      if (c) c.textContent = `${editPuntosLibres.length} punto${editPuntosLibres.length !== 1 ? 's' : ''}`;
    }
  });

  // ── Controles OSRM edición ────────────────────────────────────────────────
  tabContent.querySelector('#edit-btn-puntoA').addEventListener('click', () => {
    editModoOsrm = 'A';
    editInstruccion.textContent = '🟢 Toca el mapa para marcar el Punto A (inicio).';
  });

  tabContent.querySelector('#edit-btn-puntoB').addEventListener('click', () => {
    editModoOsrm = 'B';
    editInstruccion.textContent = '🔴 Toca el mapa para marcar el Punto B (fin).';
  });

  tabContent.querySelector('#edit-btn-trazar').addEventListener('click', async () => {
    if (!editPuntoA || !editPuntoB) {
      mostrarToast('Marca Punto A y Punto B antes de trazar', 'warning');
      return;
    }
    editInstruccion.textContent = '⏳ Trazando ruta...';
    tabContent.querySelector('#edit-btn-trazar').disabled = true;

    const url = `https://router.project-osrm.org/route/v1/driving/${editPuntoA.lng},${editPuntoA.lat};${editPuntoB.lng},${editPuntoB.lat}?overview=full&geometries=geojson`;
    try {
      const res  = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const coords  = data.routes[0].geometry.coordinates;
        const latLngs = coords.map(c => [c[1], c[0]]);
        if (editRutaPoly) map.removeLayer(editRutaPoly);
        editRutaPoly = L.polyline(latLngs, { color: '#4f46e5', weight: 5, opacity: 0.85 }).addTo(map);
        map.fitBounds(editRutaPoly.getBounds(), { padding: [30, 30] });
        tabContent.querySelector('#edit-adm-ruta').value = JSON.stringify(coords);
        tabContent.querySelector('#info-ruta-actual').innerHTML = `📐 Nueva ruta: <strong>${coords.length} puntos</strong>`;
        editInstruccion.textContent = `✅ Ruta trazada (${coords.length} puntos). Guarda los cambios.`;
      } else {
        mostrarToast('No se pudo trazar la ruta', 'error');
        editInstruccion.textContent = '❌ Error al trazar. Prueba otros puntos.';
      }
    } catch {
      mostrarToast('Error de conexión con OSRM', 'error');
      editInstruccion.textContent = '❌ Error de conexión.';
    } finally {
      tabContent.querySelector('#edit-btn-trazar').disabled = false;
    }
  });

  // ── Controles libre edición ───────────────────────────────────────────────
  tabContent.querySelector('#edit-btn-deshacer').addEventListener('click', () => {
    if (editPuntosLibres.length === 0) return;
    editPuntosLibres.pop();
    const m = editMarkersLibres.pop();
    if (m) map.removeLayer(m);
    dibujarEditPolyLibre();
    const coords = editPuntosLibres.map(([lt, ln]) => [ln, lt]);
    tabContent.querySelector('#edit-adm-ruta').value = coords.length > 0 ? JSON.stringify(coords) : '';
    const c = tabContent.querySelector('#edit-contador');
    if (c) c.textContent = `${editPuntosLibres.length} punto${editPuntosLibres.length !== 1 ? 's' : ''}`;
  });

  tabContent.querySelector('#edit-btn-limpiar').addEventListener('click', () => {
    limpiarEditLibre();
    tabContent.querySelector('#edit-adm-ruta').value = '';
  });

  // ── Limpiar ruta guardada ─────────────────────────────────────────────────
  tabContent.querySelector('#edit-btn-limpiar-ruta').addEventListener('click', () => {
    tabContent.querySelector('#edit-adm-ruta').value = '';
    tabContent.querySelector('#info-ruta-actual').innerHTML = '⚠️ Ruta eliminada. Guarda para confirmar.';
    limpiarEditLibre();
    [editMarkerA, editMarkerB].forEach(m => { if (m) map.removeLayer(m); });
    if (editRutaPoly) { map.removeLayer(editRutaPoly); editRutaPoly = null; }
    mostrarToast('Ruta marcada para eliminar. Guarda los cambios.', 'warning');
  });

  // ── Guardar cambios ───────────────────────────────────────────────────────
  tabContent.querySelector('#edit-btn-guardar').addEventListener('click', async () => {
    const nombre    = tabContent.querySelector('#edit-nombre').value.trim();
    const estado    = tabContent.querySelector('#edit-estado').value;
    const link      = tabContent.querySelector('#edit-link').value.trim();
    const latVal    = tabContent.querySelector('#edit-lat').value.trim();
    const lngVal    = tabContent.querySelector('#edit-lng').value.trim();
    const rutaJson  = tabContent.querySelector('#edit-adm-ruta').value;

    if (!nombre) { mostrarToast('El nombre no puede estar vacío', 'warning'); return; }

    let ruta = null;
    if (rutaJson) {
      try { ruta = JSON.parse(rutaJson); } catch { mostrarToast('Ruta inválida, limpia y vuelve a trazar', 'error'); return; }
    }

    const btn = tabContent.querySelector('#edit-btn-guardar');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    const { error } = await supabase.from('calles').update({
      nombre:             normalizarCalle(nombre),
      estado,
      enlace_google_maps: link   || null,
      latitud:            latVal ? parseFloat(latVal) : null,
      longitud:           lngVal ? parseFloat(lngVal) : null,
      ruta_json:          ruta,
    }).eq('id', calle.id);

    if (error) {
      mostrarToast('Error al guardar: ' + error.message, 'error');
    } else {
      mostrarToast('✅ Cambios guardados', 'success');
      // Volver a la gestión con la búsqueda del nombre editado
      renderGestionCalles(tabContent, rootContainer);
    }

    btn.disabled  = false;
    btn.innerHTML = '💾 Guardar cambios';
  });

  // ── Eliminar calle ────────────────────────────────────────────────────────
  tabContent.querySelector('#edit-btn-eliminar').addEventListener('click', async () => {
    // Modal de confirmación visual (sin usar confirm() nativo)
    const confirmEl = document.createElement('div');
    confirmEl.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.55);
      display:flex; align-items:center; justify-content:center; padding:20px;
    `;
    confirmEl.innerHTML = `
      <div style="background:#fff; border-radius:14px; padding:24px; width:100%; max-width:340px; box-shadow:0 8px 30px rgba(0,0,0,0.2);">
        <h3 style="margin-bottom:8px; font-size:1.1rem;">⚠️ Eliminar calle</h3>
        <p style="color:#64748b; font-size:0.9rem; margin-bottom:18px;">
          ¿Seguro que quieres eliminar <strong>"${calle.nombre}"</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div style="display:flex; gap:10px;">
          <button id="confirm-cancel" class="btn-secondary" style="flex:1;">Cancelar</button>
          <button id="confirm-delete" class="btn-exit" style="flex:1;">Sí, eliminar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmEl);

    confirmEl.querySelector('#confirm-cancel').onclick = () => confirmEl.remove();
    confirmEl.querySelector('#confirm-delete').onclick = async () => {
      confirmEl.remove();
      const { error } = await supabase.from('calles').delete().eq('id', calle.id);
      if (error) {
        mostrarToast('Error al eliminar: ' + error.message, 'error');
      } else {
        mostrarToast('🗑 Calle eliminada', 'info');
        renderGestionCalles(tabContent, rootContainer);
      }
    };
  });

  // ── Volver ────────────────────────────────────────────────────────────────
  tabContent.querySelector('#btn-volver-gestion').addEventListener('click', () => {
    renderGestionCalles(tabContent, rootContainer);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: APROBACIÓN DE DIRECCIONES / REPORTES
// ─────────────────────────────────────────────────────────────────────────────
async function renderAprobacionDirecciones(tabContent, rootContainer, onCambio) {
  tabContent.innerHTML = `
    <div class="card">
      <h3>📋 Reportes de direcciones</h3>

      <!-- Filtros -->
      <div class="filtro-tabs">
        <button class="filtro-btn active" data-filtro="pendiente">⏳ Pendientes</button>
        <button class="filtro-btn" data-filtro="aprobado">✅ Aprobados</button>
        <button class="filtro-btn" data-filtro="rechazado">❌ Rechazados</button>
        <button class="filtro-btn" data-filtro="todos">📦 Todos</button>
      </div>

      <!-- Buscador por número o calle -->
      <input
        type="text"
        id="busq-dir"
        placeholder="🔍 Filtrar por número o calle..."
        autocomplete="off"
        style="margin-bottom:12px;"
      >
    </div>

    <!-- Resumen -->
    <div id="dir-resumen" style="
      display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px;
    "></div>

    <!-- Lista -->
    <div id="dir-lista">
      <div class="loading-overlay">
        <span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span>
        Cargando reportes...
      </div>
    </div>

    <!-- Modal mapa para ver ubicación -->
    <div id="modal-ver-mapa" style="
      display:none; position:fixed; inset:0; z-index:9997;
      background:rgba(0,0,0,0.6);
      align-items:center; justify-content:center; padding:16px;
    ">
      <div style="
        background:#fff; border-radius:16px; width:100%;
        max-width:520px; overflow:hidden;
        box-shadow:0 8px 30px rgba(0,0,0,0.25);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px;">
          <strong id="modal-mapa-titulo" style="font-size:1rem;">Ubicación</strong>
          <button id="modal-mapa-cerrar" style="
            background:none; border:none; font-size:1.3rem;
            color:#94a3b8; cursor:pointer; padding:4px;
          ">✕</button>
        </div>
        <div id="modal-mapa-container" style="height:320px;"></div>
        <div style="padding:12px 16px; display:flex; gap:8px;">
          <button id="modal-mapa-gmaps" style="
            flex:1; padding:10px; border:none; border-radius:10px;
            background:#1a73e8; color:#fff; font-size:0.9rem;
            font-weight:600; cursor:pointer; font-family:inherit;
          ">🗺️ Abrir en Google Maps</button>
        </div>
      </div>
    </div>
  `;

  // ── Estado ────────────────────────────────────────────────────────────────
  let filtroActivo  = 'pendiente';
  let busquedaTexto = '';
  let todosDatos    = [];
  let mapaModal     = null;

  // ── Cargar datos ──────────────────────────────────────────────────────────
  async function cargarDatos() {
    tabContent.querySelector('#dir-lista').innerHTML = `
      <div class="loading-overlay">
        <span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span>
        Cargando...
      </div>
    `;

    const { data, error } = await supabase
      .from('direcciones')
      .select(`
        id, numero, comentario, latitud, longitud,
        estado, creado_en,
        calles  ( id, nombre ),
        perfiles ( nombre )
      `)
      .order('creado_en', { ascending: false });

    if (error || !data) {
      tabContent.querySelector('#dir-lista').innerHTML =
        `<div class="card text-center text-muted">Error al cargar reportes.</div>`;
      return;
    }

    todosDatos = data;
    renderResumen(data);
    renderLista();
  }

  // ── Resumen de conteos ────────────────────────────────────────────────────
  function renderResumen(data) {
    const pendientes = data.filter(d => d.estado === 'pendiente').length;
    const aprobados  = data.filter(d => d.estado === 'aprobado').length;
    const rechazados = data.filter(d => d.estado === 'rechazado').length;

    const resEl = tabContent.querySelector('#dir-resumen');
    resEl.innerHTML = [
      { label: 'Pendientes', count: pendientes, bg: '#fef3c7', color: '#92400e', emoji: '⏳' },
      { label: 'Aprobados',  count: aprobados,  bg: '#d1fae5', color: '#065f46', emoji: '✅' },
      { label: 'Rechazados', count: rechazados, bg: '#fee2e2', color: '#991b1b', emoji: '❌' },
    ].map(item => `
      <div style="
        background:${item.bg}; border-radius:10px;
        padding:10px 8px; text-align:center;
      ">
        <div style="font-size:1.3rem;">${item.emoji}</div>
        <div style="font-size:1.3rem; font-weight:800; color:${item.color};">${item.count}</div>
        <div style="font-size:0.72rem; color:${item.color}; font-weight:600;">${item.label}</div>
      </div>
    `).join('');
  }

  // ── Render lista filtrada ─────────────────────────────────────────────────
  function renderLista() {
    let datos = todosDatos;

    // Filtro por estado
    if (filtroActivo !== 'todos') {
      datos = datos.filter(d => d.estado === filtroActivo);
    }

    // Filtro por texto
    if (busquedaTexto.length >= 2) {
      const t = busquedaTexto.toLowerCase();
      datos = datos.filter(d =>
        d.numero.toLowerCase().includes(t) ||
        (d.calles?.nombre ?? '').toLowerCase().includes(t) ||
        (d.comentario ?? '').toLowerCase().includes(t) ||
        (d.perfiles?.nombre ?? '').toLowerCase().includes(t)
      );
    }

    const lista = tabContent.querySelector('#dir-lista');

    if (datos.length === 0) {
      lista.innerHTML = `
        <div style="text-align:center; padding:30px 16px; color:#94a3b8;">
          <div style="font-size:2rem; margin-bottom:8px;">📭</div>
          <p>Sin resultados para este filtro.</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = datos.map(d => {
      const fecha     = new Date(d.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' });
      const hora      = new Date(d.creado_en).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
      const cNombre   = d.calles?.nombre  ?? '—';
      const uNombre   = d.perfiles?.nombre ?? 'Usuario';
      const tieneUbic = d.latitud && d.longitud;

      return `
        <div class="dir-item ${d.estado}" data-id="${d.id}">

          <div class="dir-item-header">
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:1.05rem; font-weight:800; color:#1e293b;">${d.numero}</span>
                <span class="estado-chip ${d.estado}">${d.estado}</span>
              </div>
              <div style="font-size:0.8rem; color:#64748b; margin-top:3px;">
                🛣️ ${cNombre}
              </div>
              ${d.comentario ? `
                <div style="
                  font-size:0.82rem; color:#475569; margin-top:6px;
                  background:#f8fafc; padding:6px 10px; border-radius:8px;
                  border-left:3px solid #94a3b8; font-style:italic;
                ">"${d.comentario}"</div>
              ` : ''}
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:0.75rem; color:#94a3b8;">${fecha}</div>
              <div style="font-size:0.72rem; color:#94a3b8;">${hora}</div>
              <div style="font-size:0.75rem; color:#64748b; margin-top:3px;">👤 ${uNombre}</div>
            </div>
          </div>

          <div class="dir-item-actions">
            ${tieneUbic ? `
              <button class="btn-ver-mapa" data-id="${d.id}" data-lat="${d.latitud}" data-lng="${d.longitud}" data-num="${d.numero}" data-calle="${cNombre}">
                🗺️ Ver
              </button>
            ` : `
              <span style="font-size:0.78rem; color:#94a3b8; padding:8px 4px;">Sin ubicación</span>
            `}
            ${d.estado !== 'aprobado' ? `
              <button class="btn-aprobar" data-id="${d.id}">✅ Aprobar</button>
            ` : ''}
            ${d.estado !== 'rechazado' ? `
              <button class="btn-rechazar" data-id="${d.id}">❌ Rechazar</button>
            ` : ''}
            ${d.estado === 'aprobado' || d.estado === 'rechazado' ? `
              <button class="btn-eliminar-dir btn-rechazar" data-id="${d.id}" style="background:#f1f5f9; color:#64748b;">
                🗑 Borrar
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // ── Aprobar ──────────────────────────────────────────────────────────────
    lista.querySelectorAll('.btn-aprobar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, 'aprobado'));
    });

    // ── Rechazar ─────────────────────────────────────────────────────────────
    lista.querySelectorAll('.btn-rechazar').forEach(btn => {
      btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, 'rechazado'));
    });

    // ── Borrar definitivamente ────────────────────────────────────────────────
    lista.querySelectorAll('.btn-eliminar-dir').forEach(btn => {
      btn.addEventListener('click', () => eliminarDireccion(btn.dataset.id));
    });

    // ── Ver en mapa ───────────────────────────────────────────────────────────
    lista.querySelectorAll('.btn-ver-mapa').forEach(btn => {
      btn.addEventListener('click', () => {
        const lat   = parseFloat(btn.dataset.lat);
        const lng   = parseFloat(btn.dataset.lng);
        const num   = btn.dataset.num;
        const calle = btn.dataset.calle;
        abrirModalMapa(lat, lng, num, calle);
      });
    });
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────
  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase
      .from('direcciones')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      mostrarToast('Error: ' + error.message, 'error');
      return;
    }

    const emoji = nuevoEstado === 'aprobado' ? '✅' : '❌';
    mostrarToast(`${emoji} Reporte marcado como ${nuevoEstado}`, 'success');

    // Actualizar local sin re-fetch
    const idx = todosDatos.findIndex(d => d.id === id);
    if (idx !== -1) todosDatos[idx].estado = nuevoEstado;
    renderResumen(todosDatos);
    renderLista();

    // Actualizar badge del tab
    if (onCambio) onCambio();
  }

  // ── Eliminar dirección ────────────────────────────────────────────────────
  async function eliminarDireccion(id) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.55);
      display:flex; align-items:center; justify-content:center; padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:#fff; border-radius:14px; padding:24px; width:100%; max-width:320px; box-shadow:0 8px 30px rgba(0,0,0,0.2);">
        <h3 style="margin-bottom:8px; font-size:1.05rem;">🗑 Borrar reporte</h3>
        <p style="color:#64748b; font-size:0.9rem; margin-bottom:18px;">
          ¿Seguro? Esta acción no se puede deshacer.
        </p>
        <div style="display:flex; gap:10px;">
          <button id="cc" class="btn-secondary" style="flex:1;">Cancelar</button>
          <button id="cd" class="btn-exit"      style="flex:1;">Borrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#cc').onclick = () => modal.remove();
    modal.querySelector('#cd').onclick = async () => {
      modal.remove();
      const { error } = await supabase.from('direcciones').delete().eq('id', id);
      if (error) {
        mostrarToast('Error al borrar: ' + error.message, 'error');
      } else {
        mostrarToast('🗑 Reporte eliminado', 'info');
        todosDatos = todosDatos.filter(d => d.id !== id);
        renderResumen(todosDatos);
        renderLista();
        if (onCambio) onCambio();
      }
    };
  }

  // ── Modal ver en mapa ─────────────────────────────────────────────────────
  function abrirModalMapa(lat, lng, numero, calle) {
    const modal = tabContent.querySelector('#modal-ver-mapa');
    modal.style.display = 'flex';
    tabContent.querySelector('#modal-mapa-titulo').textContent = `${numero} — ${calle}`;

    // Destruir mapa anterior si existe
    const mc = tabContent.querySelector('#modal-mapa-container');
    if (mapaModal) {
      mapaModal.remove();
      mapaModal = null;
    }
    mc.innerHTML = '';

    // Pequeño delay para que el DOM esté listo
    setTimeout(() => {
      mapaModal = L.map(mc).setView([lat, lng], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM'
      }).addTo(mapaModal);
      L.marker([lat, lng])
        .addTo(mapaModal)
        .bindPopup(`<strong>${numero}</strong><br>${calle}`)
        .openPopup();
    }, 50);

    tabContent.querySelector('#modal-mapa-cerrar').onclick = () => {
      modal.style.display = 'none';
    };
    tabContent.querySelector('#modal-mapa-gmaps').onclick = () => {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  tabContent.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabContent.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActivo = btn.dataset.filtro;
      renderLista();
    });
  });

  // ── Buscador ──────────────────────────────────────────────────────────────
  let debTimer;
  tabContent.querySelector('#busq-dir').addEventListener('input', (e) => {
    clearTimeout(debTimer);
    debTimer = setTimeout(() => {
      busquedaTexto = e.target.value.trim();
      renderLista();
    }, 250);
  });

  // ── Carga inicial ─────────────────────────────────────────────────────────
  await cargarDatos();
}
