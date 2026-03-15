// ui/loginView.js
import { iniciarSesion, registrarUsuario } from '../api/auth';
import { mostrarToast } from '../utils/toast';

export function renderLoginView(container) {
  document.body.classList.remove('map-view');

  container.innerHTML = `
    <div class="view-centered">
      <div class="auth-card">
        <h1>📍 VH Maps</h1>
        <p class="subtitle" id="auth-subtitle">Accede a tu cuenta</p>

        <form id="auth-form" novalidate>
          <input type="email"    id="email"    placeholder="Correo electrónico" required autocomplete="email">
          <input type="password" id="pass"     placeholder="Contraseña"         required autocomplete="current-password">

          <div id="reg-fields" style="display:none; flex-direction:column;">
            <input type="password" id="pass-conf"  placeholder="Confirmar contraseña" autocomplete="new-password">
            <input type="text"     id="nombre"      placeholder="Nombre completo">
            <input type="date"     id="fecha-nac"   placeholder="Fecha de nacimiento">
          </div>

          <button type="submit" id="btn-main" class="btn-primary" style="margin-top:14px;">
            Entrar
          </button>
        </form>

        <button id="toggle-auth" class="btn-link" style="margin-top:10px;">
          ¿No tienes cuenta? Regístrate
        </button>
        <button id="back-public" class="btn-link" style="margin-top:4px; color:#64748b;">
          ← Volver al mapa
        </button>
      </div>
    </div>
  `;

  let isLogin = true;
  const regFields  = container.querySelector('#reg-fields');
  const toggleBtn  = container.querySelector('#toggle-auth');
  const subtitle   = container.querySelector('#auth-subtitle');
  const btnMain    = container.querySelector('#btn-main');

  toggleBtn.onclick = () => {
    isLogin = !isLogin;
    regFields.style.display = isLogin ? 'none' : 'flex';
    toggleBtn.textContent   = isLogin ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta, iniciar sesión';
    btnMain.textContent     = isLogin ? 'Entrar' : 'Crear Cuenta';
    subtitle.textContent    = isLogin ? 'Accede a tu cuenta' : 'Crea tu cuenta nueva';
  };

  container.querySelector('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = container.querySelector('#email').value.trim();
    const pass  = container.querySelector('#pass').value;

    btnMain.disabled    = true;
    btnMain.innerHTML   = '<span class="spinner"></span>';

    try {
      if (isLogin) {
        const { error } = await iniciarSesion(email, pass);
        if (error) {
          mostrarToast(traducirError(error.message), 'error');
        }
      } else {
        const passConf = container.querySelector('#pass-conf').value;
        if (pass !== passConf) {
          mostrarToast('Las contraseñas no coinciden', 'warning');
          return;
        }
        const { error } = await registrarUsuario(
          email,
          pass,
          container.querySelector('#nombre').value.trim(),
          container.querySelector('#fecha-nac').value
        );
        if (error) {
          mostrarToast(traducirError(error.message), 'error');
        } else {
          mostrarToast('✅ Revisa tu correo para confirmar tu cuenta', 'success', 5000);
        }
      }
    } finally {
      btnMain.disabled  = false;
      btnMain.textContent = isLogin ? 'Entrar' : 'Crear Cuenta';
    }
  };

  container.querySelector('#back-public').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'public' }));
  };
}

// Traduce mensajes de error de Supabase Auth al español
function traducirError(msg) {
  if (!msg) return 'Error desconocido';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (msg.includes('Email not confirmed'))        return 'Confirma tu correo antes de entrar';
  if (msg.includes('User already registered'))    return 'Este correo ya está registrado';
  if (msg.includes('Password should be'))         return 'La contraseña debe tener al menos 6 caracteres';
  return msg;
}
