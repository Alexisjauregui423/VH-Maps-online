import { supabase } from './supabase'

export const registrarUsuario = async (email, password, nombre, fechaNacimiento) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, fecha_nacimiento: fechaNacimiento } }
  })
}

export const iniciarSesion = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

// Función para asignar el rol después del primer ingreso
export const actualizarRol = async (userId, nuevoRol) => {
  return await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', userId)
}
