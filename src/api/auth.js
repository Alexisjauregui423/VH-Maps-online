// api/auth.js
import { supabase } from './supabase';

export const registrarUsuario = async (email, password, nombre, fechaNacimiento) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, fecha_nacimiento: fechaNacimiento } }
  });
};

export const iniciarSesion = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

/**
 * Asigna el rol al perfil del usuario.
 * Usa UPSERT en lugar de UPDATE para manejar dos casos:
 *   1. El perfil ya existe (usuario que ya inició sesión antes) → actualiza
 *   2. El perfil NO existe aún (primer login sin trigger) → lo crea
 * También rescata nombre y fecha_nacimiento del metadata de registro.
 */
export const actualizarRol = async (userId, nuevoRol) => {
  // Leer metadata que se guardó en signUp (nombre, fecha_nacimiento)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: userError || new Error('No se pudo obtener el usuario') };
  }

  const nombre           = user.user_metadata?.nombre           ?? null;
  const fecha_nacimiento = user.user_metadata?.fecha_nacimiento ?? null;

  // upsert: inserta si no existe, actualiza si ya existe (onConflict en PK = id)
  return await supabase.from('perfiles').upsert(
    {
      id:    userId,
      rol:   nuevoRol,
      nombre,
      fecha_nacimiento,
    },
    { onConflict: 'id' }   // columna de conflicto = PK
  );
};
