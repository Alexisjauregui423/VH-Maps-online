import { iniciarSesion, registrarUsuario } from '../api/auth';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1>VH Maps 📍</h1>
      <form id="auth-form">
        <input type="email" id="email" placeholder="Correo" required>
        <input type="password" id="pass" placeholder="Contraseña" required>
        <div id="reg-fields" style="display:none">
          <input type="password" id="pass-conf" placeholder="Confirmar contraseña">
          <input type="text" id="nombre" placeholder="Nombre completo">
          <input type="date" id="fecha-nac">
        </div>
        <button type="submit" id="btn-main" class="btn-primary">Entrar</button>
      </form>
      <button id="toggle-auth" class="btn-link">¿No tienes cuenta? Regístrate</button>
      <button id="back-public" class="btn-link" style="margin-top:10px;">← Volver</button>
    </div>
  `;

  let isLogin = true;
  const regFields = container.querySelector('#reg-fields');
  const toggleBtn = container.querySelector('#toggle-auth');

  toggleBtn.onclick = () => {
    isLogin = !isLogin;
    regFields.style.display = isLogin ? 'none' : 'flex';
    regFields.style.flexDirection = 'column';
    toggleBtn.innerText = isLogin ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta';
    container.querySelector('#btn-main').innerText = isLogin ? 'Entrar' : 'Crear Cuenta';
  };

  container.querySelector('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = container.querySelector('#email').value;
    const pass = container.querySelector('#pass').value;

    if (isLogin) {
      const { error } = await iniciarSesion(email, pass);
      if (error) alert(error.message);
    } else {
      const passConf = container.querySelector('#pass-conf').value;
      if (pass !== passConf) return alert('Contraseñas no coinciden');
      const { error } = await registrarUsuario(
        email,
        pass,
        container.querySelector('#nombre').value,
        container.querySelector('#fecha-nac').value
      );
      if (error) alert(error.message);
      else alert('¡Revisa tu correo!');
    }
  };

  container.querySelector('#back-public').onclick = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'public' }));
  };
}
