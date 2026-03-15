// src/main.js
import './style.css';
import 'leaflet/dist/leaflet.css';
import { supabase }              from './api/supabase';
import { precalentarCache, sincronizarCache } from './api/busqueda';
import { renderPublicView }      from './ui/publicView';
import { renderLoginView }       from './ui/loginView';
import { renderRoleSelectionView } from './ui/roleSelectionView';
import { renderUserView }        from './ui/userView';
import { renderAdminPanel }      from './ui/adminView';

const app = document.querySelector('#app');

// ─── Registro del Service Worker ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(err => console.warn('[SW] No se pudo registrar:', err));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
async function inicializarApp() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Vista pública: precalentar caché en segundo plano
      precalentarCache();
      renderPublicView(app);
      return;
    }

    // Login activo: sincronizar caché (1 mini-query para comparar timestamps)
    // No esperamos — la UI se carga en paralelo y el caché se actualiza al fondo
    sincronizarCache();

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (!perfil || perfil.rol === 'usuario') {
      renderRoleSelectionView(app, session.user.id);
      return;
    }

    if (perfil.rol === 'admin') {
      renderAdminPanel(app);
    } else {
      // ✅ FIX: renderUserView es async, necesita await
      await renderUserView(app, perfil.rol);
    }

  } catch (err) {
    console.error('[inicializarApp]', err);
    app.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100dvh;flex-direction:column;gap:12px;">
        <p style="color:#64748b;">Error de conexión.</p>
        <button onclick="location.reload()" style="
          background:#4f46e5;color:#fff;border:none;padding:10px 20px;
          border-radius:10px;cursor:pointer;font-size:1rem;
        ">Reintentar</button>
      </div>
    `;
  }
}

// ─── Cambios de sesión ────────────────────────────────────────────────────────
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    inicializarApp();
  }
});

// ─── Router por CustomEvents ──────────────────────────────────────────────────
window.addEventListener('navigate', async (e) => {
  const { detail } = e;

  if (typeof detail === 'string') {
    if (detail === 'login')  renderLoginView(app);
    else if (detail === 'public') renderPublicView(app);
    else if (detail === 'reload') await inicializarApp();

  } else if (detail && typeof detail === 'object') {
    if (detail.view === 'user' && detail.rol) {
      await renderUserView(app, detail.rol);
    } else if (detail.view === 'admin') {
      renderAdminPanel(app);
    }
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
inicializarApp();

