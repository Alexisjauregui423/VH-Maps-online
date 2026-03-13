export const normalizarCalle = (texto) => {
  return texto.toLowerCase()
    .replace(/\bprol\.?\b/g, 'prolongacion')
    .replace(/\bav\.?\b/g, 'avenida')
    .replace(/\bcalle\b/g, '') // Quitamos la palabra 'calle' para buscar por nombre puro
    .trim();
}
