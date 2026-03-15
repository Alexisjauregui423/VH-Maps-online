// utils/toast.js
// Reemplaza alert() con notificaciones visuales no bloqueantes

let contenedor = null;

function getContenedor() {
  if (!contenedor || !document.body.contains(contenedor)) {
    contenedor = document.getElementById('toast-container');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'toast-container';
      document.body.appendChild(contenedor);
    }
  }
  return contenedor;
}

/**
 * Muestra una notificación tipo toast
 * @param {string} mensaje - Texto a mostrar
 * @param {'success'|'error'|'info'|'warning'} tipo - Tipo de toast
 * @param {number} duracion - Duración en ms (default: 3000)
 */
export function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
  const cont = getContenedor();

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;

  cont.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duracion + 300); // +300 para que la animación de salida termine
}
