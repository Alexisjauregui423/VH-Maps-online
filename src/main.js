import './style.css';
import 'leaflet/dist/leaflet.css';
import { supabase } from './api/supabase';
import { renderPublicView } from './ui/publicView';
import { renderLoginView } from './ui/loginView';
import { renderRoleSelectionView } from './ui/roleSelectionView';
import { renderUserView } from './ui/userView';
import { renderAdminPanel } from './ui/adminView';

const app = document.querySelector('#app');

async function inicializarApp() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      renderPublicView(app);
      return;
    }

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
      renderUserView(app, perfil.rol);
    }
  } catch (err) {
    app.innerHTML = '<p>Error de conexión. Recarga la página.</p>';
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    inicializarApp();
  }
});

window.addEventListener('navigate', (e) => {
  const { detail } = e;
  if (typeof detail === 'string') {
    // Navegación simple
    if (detail === 'login') renderLoginView(app);
    else if (detail === 'public') renderPublicView(app);
    else if (detail === 'reload') inicializarApp();
  } else if (detail && typeof detail === 'object') {
    // Navegación con parámetros
    if (detail.view === 'user' && detail.rol) {
      renderUserView(app, detail.rol);
    } else if (detail.view === 'admin') {
      renderAdminPanel(app);
    }
    // Podemos añadir más casos si es necesario
  }
});

inicializarApp();
