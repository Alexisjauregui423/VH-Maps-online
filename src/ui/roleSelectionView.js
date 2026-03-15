// ui/roleSelectionView.js
import { actualizarRol } from '../api/auth';
import { mostrarToast } from '../utils/toast';

export function renderRoleSelectionView(container, userId) {
  document.body.classList.remove('map-view');

  container.innerHTML = `
    <div class="view-centered">
      <div class="auth-card" style="max-width:420px;">

        <h1 style="font-size:1.5rem; margin-bottom:6px;">¿Cómo usarás VH Maps?</h1>
        <p class="subtitle" style="margin-bottom:24px;">
          Elige tu rol para personalizar tu experiencia.
        </p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">

          <button class="role-card" data-role="repartidor" style="
            display:flex; flex-direction:column; align-items:center; gap:10px;
            padding:22px 12px; border-radius:14px;
            background:#eff6ff; border:2px solid #bfdbfe;
            color:#1e40af; cursor:pointer; transition:all 0.2s;
            font-family:inherit;
          ">
            <span style="font-size:2.4rem;">🚴</span>
            <strong style="font-size:1rem;">Repartidor</strong>
            <span style="font-size:0.75rem; color:#3b82f6; text-align:center; line-height:1.3;">
              Agrega números de casas y notas de entrega
            </span>
          </button>

          <button class="role-card" data-role="negocio" style="
            display:flex; flex-direction:column; align-items:center; gap:10px;
            padding:22px 12px; border-radius:14px;
            background:#f0fdf4; border:2px solid #bbf7d0;
            color:#14532d; cursor:pointer; transition:all 0.2s;
            font-family:inherit;
          ">
            <span style="font-size:2.4rem;">🏪</span>
            <strong style="font-size:1rem;">Negocio</strong>
            <span style="font-size:0.75rem; color:#16a34a; text-align:center; line-height:1.3;">
              Consulta calles y comenta ubicaciones de clientes
            </span>
          </button>

        </div>

        <p style="font-size:0.78rem; color:#94a3b8; text-align:center;">
          Contacta al administrador si necesitas cambiar tu rol.
        </p>
      </div>
    </div>
  `;

  container.querySelectorAll('.role-card').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform   = 'translateY(-2px)';
      btn.style.boxShadow   = '0 6px 20px rgba(0,0,0,0.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform   = '';
      btn.style.boxShadow   = '';
    });

    btn.addEventListener('click', async () => {
      const rolElegido = btn.dataset.role;

      container.querySelectorAll('.role-card').forEach(b => {
        b.disabled      = true;
        b.style.opacity = '0.5';
      });
      btn.style.opacity   = '1';
      btn.innerHTML = `
        <span class="spinner" style="border-color:rgba(0,0,0,0.15); border-top-color:currentColor; width:28px; height:28px; border-width:3px;"></span>
        <span style="font-size:0.9rem; margin-top:4px;">Guardando...</span>
      `;

      const { error } = await actualizarRol(userId, rolElegido);

      if (error) {
        mostrarToast('Error al guardar tu rol. Intenta de nuevo.', 'error');
        renderRoleSelectionView(container, userId);
      } else {
        mostrarToast(`✅ Rol asignado: ${rolElegido}`, 'success');
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'reload' }));
      }
    });
  });
}
