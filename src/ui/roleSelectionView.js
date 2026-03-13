import { actualizarRol } from '../api/auth';

export function renderRoleSelectionView(container, userId) {
  container.innerHTML = `
    <div class="card">
      <h3>Selecciona tu rol</h3>
      <button class="role-btn btn-primary" data-role="repartidor">Repartidor</button>
      <button class="role-btn btn-secondary" data-role="negocio">Negocio</button>
    </div>
  `;

  container.querySelectorAll('.role-btn').forEach(b => {
    b.onclick = async (e) => {
      const { error } = await actualizarRol(userId, e.target.dataset.role);
      if (!error) {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'reload' }));
      } else {
        alert('Error al actualizar rol');
      }
    };
  });
}
