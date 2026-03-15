// ui/userView.js
import L from 'leaflet';
import { crearMapa, agregarControlGeolocalizacion, dibujarCapaCalles } from '../utils/map';
import { buscarCalle, obtenerTodasCalles }                              from '../api/busqueda';
import { CacheService }                                                 from '../api/cache';
import { supabase }                                                     from '../api/supabase';
import { mostrarToast }                                                 from '../utils/toast';

// ─── Estado global del módulo ─────────────────────────────────────────────────
let rutaPolyline    = null;
let marcadoresCalle = [];
let marcadoresUser  = [];

// ─────────────────────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function renderUserView(container, rol) {
  document.body.classList.add('map-view');

  const { data: { user } } = await supabase.auth.getUser();

  const cfg = {
    repartidor: {
      label:              '🚴 Repartidor',
      colorBadge:         '#dbeafe',
      colorText:          '#1d4ed8',
      placeholderModal:   'Ej: 142-B, S/N, Local 3',
      placeholderNota:    '"Sin número en la entrada", "Portón azul"',
      tituloModal:        '📦 Registrar dirección',
      tituloReportes:     'Mis direcciones registradas',
    },
    negocio: {
      label:              '🏪 Negocio',
      colorBadge:         '#d1fae5',
      colorText:          '#065f46',
      placeholderModal:   'Ej: Cliente Pérez, Bodega Norte',
      placeholderNota:    '"Cliente frecuente", "Zona de difícil acceso"',
      tituloModal:        '📌 Registrar punto de interés',
      tituloReportes:     'Mis puntos registrados',
    },
    admin: {
      label:              '🛡️ Admin',
      colorBadge:         '#e0e7ff',
      colorText:          '#4338ca',
      placeholderModal:   'Ej: Punto de revisión',
      placeholderNota:    'Notas internas...',
      tituloModal:        '📍 Registrar punto',
      tituloReportes:     'Mis registros',
    },
  };
  const c = cfg[rol] ?? cfg.repartidor;

  // ── HTML base ──────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="map-wrapper">
      <div id="map"></div>

      <div class="map-overlay">
        <div class="map-header">
          <span class="rol-badge" style="background:${c.colorBadge};color:${c.colorText};">${c.label}</span>
          <div style="display:flex;gap:8px;align-items:center;">
            ${rol === 'admin' ? `<button id="btn-volver-admin" class="btn-secondary" style="width:auto;padding:6px 11px;font-size:0.8rem;margin:0;">← Admin</button>` : ''}
            <button id="logout-btn" class="btn-exit" style="padding:6px 11px;font-size:0.8rem;">Salir</button>
          </div>
        </div>

        <div class="search-box">
          <input type="text" id="input-busqueda" placeholder="🔍 Buscar calle o tramo..."
            autocomplete="off" autocorrect="off" spellcheck="false">
        </div>

        <ul id="lista-coincidencias" class="lista-sugerencias" style="display:none;"></ul>
        <div id="calle-panel" class="calle-info-panel" style="display:none;"></div>
      </div>

      <!-- FAB zona derecha -->
      <div id="fab-zona" style="
        position:absolute;bottom:24px;right:14px;
        z-index:1000;display:flex;flex-direction:column;gap:10px;align-items:flex-end;
      ">
        <div id="fab-pin-chip" style="
          display:none;background:#fff;border:2px solid #4f46e5;
          border-radius:20px;padding:6px 12px;font-size:0.78rem;font-weight:700;color:#4f46e5;
          box-shadow:0 2px 8px rgba(0,0,0,0.12);align-items:center;gap:6px;white-space:nowrap;
        ">
          📍 Pin listo
          <button id="fab-cancelar-pin" style="
            background:none;border:none;color:#dc3545;cursor:pointer;
            font-size:0.9rem;padding:0;line-height:1;font-weight:700;
          ">✕</button>
        </div>

        <button id="fab-agregar" title="Toca el mapa para activar" disabled style="
          width:56px;height:56px;border-radius:50%;
          background:#cbd5e1;color:#fff;border:none;font-size:1.6rem;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:not-allowed;
          display:flex;align-items:center;justify-content:center;transition:all 0.2s;
        ">+</button>
      </div>

      <!-- FAB izquierdo: mis reportes -->
      <div style="position:absolute;bottom:24px;left:14px;z-index:1000;">
        <button id="fab-reportes" style="
          display:flex;align-items:center;gap:7px;
          background:#fff;color:#4f46e5;border:2px solid #a5b4fc;border-radius:24px;
          padding:9px 16px;font-size:0.85rem;font-weight:700;
          box-shadow:0 2px 10px rgba(0,0,0,0.12);cursor:pointer;
          transition:all 0.15s;font-family:inherit;
        ">
          📋 <span id="fab-count">Mis reportes</span>
        </button>
      </div>

      <!-- Panel "Mis reportes" (bottom sheet) -->
      <div id="panel-reportes" style="
        position:fixed;inset:0;z-index:9990;
        display:none;align-items:flex-end;justify-content:center;
      ">
        <div id="panel-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
        <div style="
          position:relative;z-index:1;background:#fff;border-radius:20px 20px 0 0;
          width:100%;max-width:520px;max-height:75dvh;
          display:flex;flex-direction:column;
          box-shadow:0 -4px 30px rgba(0,0,0,0.18);animation:slideUp 0.25s ease;
        ">
          <div style="display:flex;justify-content:center;padding:12px 0 4px;">
            <div style="width:40px;height:4px;background:#e2e8f0;border-radius:4px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 20px 12px;">
            <h3 style="font-size:1.05rem;font-weight:700;margin:0;">${c.tituloReportes}</h3>
            <button id="btn-cerrar-sheet" style="
              background:none;border:none;font-size:1.3rem;color:#94a3b8;cursor:pointer;padding:4px;line-height:1;
            ">✕</button>
          </div>
          <div id="lista-reportes" style="overflow-y:auto;padding:0 16px 24px;overscroll-behavior:contain;flex:1;">
            <div class="loading-overlay">
              <span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span>
              Cargando...
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
      #fab-agregar:hover { transform:scale(1.08); box-shadow:0 6px 18px rgba(79,70,229,0.5); }
      #fab-agregar:active { transform:scale(0.95); }
      #fab-agregar.activo {
        background:#4f46e5 !important;
        box-shadow:0 4px 14px rgba(79,70,229,0.5) !important;
        cursor:pointer !important;
        animation:fabPulse 1.8s ease-in-out 3;
      }
      #fab-reportes:hover { background:#f5f3ff; }
      #fab-pin-chip.visible { display:flex !important; animation:fadeIn 0.2s ease; }
      @keyframes fabPulse {
        0%,100%{box-shadow:0 4px 14px rgba(79,70,229,0.5)}
        50%{box-shadow:0 4px 24px rgba(79,70,229,0.85);transform:scale(1.06)}
      }
      @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    </style>
  `;

  // ── Mapa ───────────────────────────────────────────────────────────────────
  const map = crearMapa('map', 21.678470, -102.588384, 15);
  agregarControlGeolocalizacion(map);

  // ── Capa base de calles (fondo, async) ─────────────────────────────────────
  obtenerTodasCalles().then(calles => {
    try { dibujarCapaCalles(map, calles); } catch { /* mapa destruido */ }
  });

  // ── Cargar marcadores del usuario ──────────────────────────────────────────
  if (user) cargarMarcadoresUsuario(map, user.id, c);

  // ── Referencias DOM ────────────────────────────────────────────────────────
  const input      = container.querySelector('#input-busqueda');
  const lista      = container.querySelector('#lista-coincidencias');
  const callePanel = container.querySelector('#calle-panel');
  const panelSheet = container.querySelector('#panel-reportes');
  const fabAgregar = container.querySelector('#fab-agregar');
  const fabChip    = container.querySelector('#fab-pin-chip');

  let calleActual = null;
  let pinActual   = null;
  let markerPin   = null;

  // ── Helpers del pin ────────────────────────────────────────────────────────
  function activarPin(lat, lng) {
    if (markerPin) map.removeLayer(markerPin);
    pinActual = { lat, lng };

    const icono = L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:#4f46e5;transform:rotate(-45deg);
        box-shadow:0 4px 12px rgba(79,70,229,0.5);border:3px solid #fff;
        display:flex;align-items:center;justify-content:center;
      "><div style="transform:rotate(45deg);color:#fff;font-size:14px;line-height:1;margin-top:-2px;">+</div></div>`,
      iconSize: [32, 32], iconAnchor: [16, 32],
    });

    markerPin = L.marker([lat, lng], { icon: icono })
      .addTo(map)
      .bindPopup('📍 Toca + para agregar el reporte')
      .openPopup();

    fabAgregar.disabled = false;
    fabAgregar.classList.add('activo');
    fabAgregar.style.cursor = 'pointer';
    fabChip.classList.add('visible');
  }

  function cancelarPin() {
    if (markerPin) { map.removeLayer(markerPin); markerPin = null; }
    pinActual = null;
    fabAgregar.disabled = true;
    fabAgregar.classList.remove('activo');
    fabAgregar.style.background = '#cbd5e1';
    fabAgregar.style.cursor     = 'not-allowed';
    fabChip.classList.remove('visible');
  }

  // ── Click en el mapa ───────────────────────────────────────────────────────
  map.on('click', (e) => {
    if (lista.style.display === 'block') {
      lista.innerHTML = '';
      lista.style.display = 'none';
      input.blur();
      return;
    }
    callePanel.style.display = 'none';
    activarPin(e.latlng.lat, e.latlng.lng);
  });

  container.querySelector('#fab-cancelar-pin').addEventListener('click', (e) => {
    e.stopPropagation();
    cancelarPin();
  });

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  let debTimer;
  input.addEventListener('input', () => {
    clearTimeout(debTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      lista.innerHTML = '';
      lista.style.display = 'none';
      callePanel.style.display = 'none';
      return;
    }
    debTimer = setTimeout(() => realizarBusqueda(q), 280);
  });

  async function realizarBusqueda(query) {
    lista.innerHTML = `<li class="loading-overlay">
      <span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span>
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
    calleActual = calle;
    lista.style.display = 'none';
    input.value = calle.nombre;
    input.blur();

    limpiarCalleActual(map);

    if (calle.ruta_combinada?.length) {
      const latLngs = calle.ruta_combinada.map(p => [p[1], p[0]]);
      rutaPolyline = L.polyline(latLngs, { color: '#4f46e5', weight: 5, opacity: 0.9 }).addTo(map);
      map.fitBounds(rutaPolyline.getBounds(), { padding: [40, 40] });
    }

    if (calle.puntos?.length) {
      calle.puntos.forEach(p => {
        const m = L.marker([p.lat, p.lng]).addTo(map)
          .bindPopup(`<strong>${calle.nombre}</strong>`);
        marcadoresCalle.push(m);
      });
      if (!calle.ruta_combinada?.length) {
        map.fitBounds(L.featureGroup(marcadoresCalle).getBounds(), { padding: [40, 40] });
      }
    }

    callePanel.style.display       = 'flex';
    callePanel.style.flexDirection = 'column';
    callePanel.innerHTML = `
      <span class="calle-title">🛣️ ${calle.nombre}</span>
      <p style="font-size:0.8rem;color:#64748b;margin:4px 0 8px;">
        📍 Toca el mapa para marcar la ubicación exacta y luego presiona <strong>+</strong>
      </p>
      <button class="btn-maps" id="btn-gmaps">🗺️ Abrir en Google Maps</button>
      <button class="btn-cerrar" id="btn-cerrar-panel">✕ Cerrar</button>
    `;

    callePanel.querySelector('#btn-gmaps').onclick   = () => abrirGoogleMaps(calle);
    callePanel.querySelector('#btn-cerrar-panel').onclick = () => {
      limpiarCalleActual(map);
      callePanel.style.display = 'none';
      input.value = '';
      calleActual = null;
    };
  }

  // ── FAB + agregar ──────────────────────────────────────────────────────────
  fabAgregar.addEventListener('click', () => {
    if (!pinActual) return;
    abrirModalReporte(calleActual, pinActual.lat, pinActual.lng, user, c, () => {
      cancelarPin();
      // Invalidar caché de dirs para que se recarguen con la nueva
      CacheService.invalidarDirecciones(user?.id);
      cargarMarcadoresUsuario(map, user.id, c);
    });
  });

  // ── Panel "Mis reportes" ───────────────────────────────────────────────────
  container.querySelector('#fab-reportes').addEventListener('click', () => {
    abrirPanelReportes(panelSheet, user, c, map);
  });
  container.querySelector('#btn-cerrar-sheet').addEventListener('click', () => {
    panelSheet.style.display = 'none';
  });
  container.querySelector('#panel-backdrop').addEventListener('click', () => {
    panelSheet.style.display = 'none';
  });

  // ── Navegación ─────────────────────────────────────────────────────────────
  container.querySelector('#btn-volver-admin')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'admin' } }));
  });
  container.querySelector('#logout-btn').addEventListener('click', () => {
    supabase.auth.signOut();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CARGAR MARCADORES DEL USUARIO — con caché de 1 h
// ─────────────────────────────────────────────────────────────────────────────
async function cargarMarcadoresUsuario(map, userId, cfg) {
  marcadoresUser.forEach(m => map.removeLayer(m));
  marcadoresUser = [];

  // Intentar desde caché primero
  let data = CacheService.obtenerDirecciones(userId);

  if (!data) {
    const { data: rows, error } = await supabase
      .from('direcciones')
      .select('id, numero, comentario, latitud, longitud, estado, creado_en')
      .eq('creado_por', userId)
      .order('creado_en', { ascending: false });

    if (error || !rows) return;
    CacheService.guardarDirecciones(userId, rows);
    data = rows;
  }

  // Actualizar contador del FAB
  const countEl = document.querySelector('#fab-count');
  if (countEl) countEl.textContent = `Mis reportes (${data.length})`;

  data.forEach(d => {
    if (!d.latitud || !d.longitud) return;

    const color = d.estado === 'aprobado' ? '#16a34a' : '#d97706';
    const icono = d.estado === 'aprobado' ? '✅' : '⏳';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:${color};color:#fff;font-size:10px;font-weight:700;
        padding:3px 7px;border-radius:6px;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        white-space:nowrap;max-width:80px;
        overflow:hidden;text-overflow:ellipsis;
      ">${icono} ${d.numero}</div>`,
      iconAnchor: [0, 0],
    });

    const marker = L.marker([d.latitud, d.longitud], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:160px;">
          <strong>${d.numero}</strong><br>
          <span style="font-size:0.82rem;color:#64748b;">${d.comentario || 'Sin nota'}</span><br>
          <span style="font-size:0.78rem;background:${color}20;color:${color};
            padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">
            ${d.estado}
          </span>
        </div>
      `);
    marcadoresUser.push(marker);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL "MIS REPORTES" — bottom sheet con caché
// ─────────────────────────────────────────────────────────────────────────────
async function abrirPanelReportes(panelSheet, user, cfg, map) {
  panelSheet.style.display = 'flex';
  const listaEl = panelSheet.querySelector('#lista-reportes');
  listaEl.innerHTML = `<div class="loading-overlay">
    <span class="spinner" style="border-color:rgba(79,70,229,.3);border-top-color:#4f46e5;"></span>
    Cargando...
  </div>`;

  // Intentar desde caché
  let data = CacheService.obtenerDirecciones(user?.id);

  if (!data) {
    const { data: rows, error } = await supabase
      .from('direcciones')
      .select('id, numero, comentario, latitud, longitud, estado, creado_en, calles(nombre)')
      .eq('creado_por', user.id)
      .order('creado_en', { ascending: false });

    if (error || !rows) {
      listaEl.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;">Error al cargar.</p>`;
      return;
    }
    CacheService.guardarDirecciones(user.id, rows);
    data = rows;
  }

  if (!data.length) {
    listaEl.innerHTML = `
      <div style="text-align:center;padding:30px 16px;">
        <div style="font-size:2.5rem;margin-bottom:10px;">📭</div>
        <p style="color:#64748b;font-size:0.95rem;">Aún no tienes registros.</p>
        <p style="color:#94a3b8;font-size:0.85rem;margin-top:6px;">
          Busca una calle en el mapa y toca el botón +
        </p>
      </div>
    `;
    return;
  }

  listaEl.innerHTML = data.map(d => {
    const color   = d.estado === 'aprobado' ? '#16a34a' : '#d97706';
    const bgChip  = d.estado === 'aprobado' ? '#d1fae5' : '#fef3c7';
    const fecha   = new Date(d.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
    const cNombre = d.calles?.nombre ?? 'Sin calle asignada';

    return `
      <div class="reporte-item" data-lat="${d.latitud}" data-lng="${d.longitud}" style="
        background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;
        padding:12px 14px;margin-bottom:10px;cursor:pointer;
        transition:border-color 0.2s,background 0.2s;
      ">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.95rem;color:#1e293b;">${d.numero}</div>
            <div style="font-size:0.8rem;color:#64748b;margin-top:2px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              🛣️ ${cNombre}
            </div>
            ${d.comentario ? `<div style="font-size:0.8rem;color:#475569;margin-top:4px;font-style:italic;">"${d.comentario}"</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
            <span style="font-size:0.72rem;font-weight:700;padding:3px 9px;
              border-radius:20px;background:${bgChip};color:${color};">
              ${d.estado}
            </span>
            <span style="font-size:0.72rem;color:#94a3b8;">${fecha}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  listaEl.querySelectorAll('.reporte-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.borderColor = '#a5b4fc'; item.style.background = '#fafafe';
    });
    item.addEventListener('mouseleave', () => {
      item.style.borderColor = '#e2e8f0'; item.style.background = '#fff';
    });
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      if (lat && lng) {
        import('../utils/map').then(({ getMap }) => {
          getMap()?.flyTo([lat, lng], 18);
        });
      }
      panelSheet.style.display = 'none';
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL AGREGAR REPORTE
// ─────────────────────────────────────────────────────────────────────────────
function abrirModalReporte(calleActual, lat, lng, user, cfg, onGuardado) {
  document.querySelector('#modal-reporte')?.remove();

  const nombreCalle = calleActual?.nombre ?? '(sin calle seleccionada)';
  const modal = document.createElement('div');
  modal.id = 'modal-reporte';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9998;
    background:rgba(0,0,0,0.55);
    display:flex;align-items:flex-end;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px 20px 0 0;
      width:100%;max-width:520px;padding:20px 20px 36px;
      box-shadow:0 -4px 30px rgba(0,0,0,0.18);animation:slideUp 0.25s ease;
    ">
      <div style="display:flex;justify-content:center;margin-bottom:14px;">
        <div style="width:40px;height:4px;background:#e2e8f0;border-radius:4px;"></div>
      </div>

      <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:2px;">${cfg.tituloModal}</h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px;">
        <div style="background:#f0f4ff;border-radius:8px;padding:8px 10px;">
          <div style="font-size:0.7rem;color:#6366f1;font-weight:700;margin-bottom:2px;">🛣️ CALLE</div>
          <div style="font-size:0.82rem;font-weight:600;color:#1e293b;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombreCalle}</div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:8px 10px;">
          <div style="font-size:0.7rem;color:#16a34a;font-weight:700;margin-bottom:2px;">📍 UBICACIÓN</div>
          <div style="font-size:0.78rem;color:#1e293b;font-weight:600;">
            ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
        </div>
      </div>

      <label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">
        Número / Identificador *
      </label>
      <input type="text" id="modal-numero" placeholder="${cfg.placeholderModal}"
        autocomplete="off" style="
          width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;
          border-radius:10px;font-size:1rem;font-family:inherit;
          margin-bottom:12px;box-sizing:border-box;
        ">

      <label style="font-size:0.82rem;font-weight:600;color:#374151;display:block;margin-bottom:4px;">
        Nota (opcional)
      </label>
      <textarea id="modal-nota" placeholder="${cfg.placeholderNota}" rows="2" style="
        width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;
        border-radius:10px;font-size:0.95rem;font-family:inherit;
        resize:none;margin-bottom:16px;box-sizing:border-box;
      "></textarea>

      <div style="display:flex;gap:10px;">
        <button id="modal-cancelar" style="
          flex:1;padding:13px;border-radius:10px;border:none;
          background:#f1f5f9;color:#475569;font-size:0.95rem;
          font-weight:600;cursor:pointer;font-family:inherit;
        ">Cancelar</button>
        <button id="modal-guardar" style="
          flex:2;padding:13px;border-radius:10px;border:none;
          background:#4f46e5;color:#fff;font-size:0.95rem;
          font-weight:600;cursor:pointer;font-family:inherit;margin:0;
        ">💾 Guardar</button>
      </div>
    </div>
    <style>
      @keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
      #modal-numero:focus,#modal-nota:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,0.15);}
    </style>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.querySelector('#modal-numero')?.focus(), 100);

  const cerrar = () => modal.remove();

  modal.querySelector('#modal-cancelar').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  modal.querySelector('#modal-guardar').addEventListener('click', async () => {
    const numero = modal.querySelector('#modal-numero').value.trim();
    const nota   = modal.querySelector('#modal-nota').value.trim();

    if (!numero) {
      const inp = modal.querySelector('#modal-numero');
      inp.style.borderColor = '#dc3545';
      inp.focus();
      setTimeout(() => { inp.style.borderColor = '#e2e8f0'; }, 2000);
      mostrarToast('El número / identificador es obligatorio', 'warning');
      return;
    }

    const btnG = modal.querySelector('#modal-guardar');
    btnG.disabled  = true;
    btnG.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2.5px;"></span> Guardando...';

    const { error } = await supabase.from('direcciones').insert([{
      calle_id:   calleActual?.id  ?? null,
      numero,
      latitud:    lat,
      longitud:   lng,
      comentario: nota             || null,
      estado:     'pendiente',
      creado_por: user?.id         ?? null,
    }]);

    if (error) {
      mostrarToast('Error al guardar: ' + error.message, 'error');
      btnG.disabled  = false;
      btnG.innerHTML = '💾 Guardar';
    } else {
      mostrarToast('✅ Guardado — pendiente de aprobación del admin', 'success', 4000);
      cerrar();
      if (onGuardado) onGuardado();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function limpiarCalleActual(map) {
  if (rutaPolyline) { map.removeLayer(rutaPolyline); rutaPolyline = null; }
  marcadoresCalle.forEach(m => map.removeLayer(m));
  marcadoresCalle = [];
}

function abrirGoogleMaps(calle) {
  let url;
  if (calle.enlaces?.length)     url = calle.enlaces[0];
  else if (calle.puntos?.length) url = `https://www.google.com/maps?q=${calle.puntos[0].lat},${calle.puntos[0].lng}`;
  else                           url = `https://www.google.com/maps/search/${encodeURIComponent(calle.nombre)}`;
  window.open(url, '_blank');
}
