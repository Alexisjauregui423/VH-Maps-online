# 📍 VH-Maps

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://vh-maps-public.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Made with Leaflet](https://img.shields.io/badge/Made%20with-Leaflet-199900.svg)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg)](https://supabase.com/)

**VH-Maps** es una aplicación web colaborativa de mapeo para el municipio de **Villa Hidalgo, Jalisco, México**. Permite registrar calles con rutas georreferenciadas y que repartidores o negocios agreguen reportes de direcciones con notas sobre ubicaciones específicas. Un administrador revisa y aprueba cada reporte.

🌐 **Demo en vivo:** [vh-maps-public.netlify.app](https://vh-maps-public.netlify.app/)

---

## ¿Qué problema resuelve?

En municipios pequeños como Villa Hidalgo muchas calles no tienen nomenclatura oficial digitalizada, los números de casas son inconsistentes o directamente no existen, y las referencias son informales ("la casa del portón azul", "frente al árbol grande"). Esto dificulta el trabajo de repartidores y negocios locales.

VH-Maps permite que la comunidad construya colectivamente un directorio de calles y direcciones verificadas, moderado por un administrador local.

---

## Screenshots

> Las capturas muestran la aplicación en móvil (Chrome Android) y desktop.

| Vista pública | Vista repartidor | Panel admin |
|---|---|---|
| ![Vista pública](docs/screenshot-public.png) | ![Repartidor](docs/screenshot-user.png) | ![Admin](docs/screenshot-admin.png) |

> ℹ️ Si quieres agregar screenshots, guárdalas en `/docs/` y actualiza esta tabla.

---

## Características principales

- 🗺️ **Mapa interactivo** con tiles de OpenStreetMap vía Leaflet
- 🔍 **Buscador de calles** con caché local (sin conexión después del primer uso)
- 🛣️ **3 modos de registro de calles:** punto único, ruta automática (OSRM) y dibujo libre
- 📦 **Reportes de direcciones** con número, nota y ubicación exacta en el mapa
- ✅ **Flujo de aprobación** — los reportes son revisados por el admin antes de publicarse
- 👥 **Sistema de roles:** Público · Repartidor · Negocio · Admin
- 📱 **100% responsivo** — diseñado primero para móvil

---

## Stack tecnológico

| Herramienta | Uso |
|---|---|
| [Vite 7](https://vitejs.dev/) | Bundler y servidor de desarrollo |
| Vanilla JS (ES Modules) | Frontend sin frameworks |
| [Leaflet 1.9](https://leafletjs.com/) | Mapas interactivos |
| [Supabase](https://supabase.com/) | Base de datos PostgreSQL + Auth + RLS |
| [OSRM](http://project-osrm.org/) | Trazado de rutas automático (API pública) |
| [Netlify](https://netlify.com/) | Deploy y hosting |

---

## Guía de inicio rápido

### Requisitos

- Node.js 18+
- npm 9+
- Cuenta en [Supabase](https://supabase.com/) (plan gratuito suficiente)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Alexisjauregui423/VH-Maps-online.git
cd VH-Maps-online
npm install
```

### 2. Configurar Supabase

Crea un proyecto nuevo en Supabase y ejecuta el siguiente SQL en **SQL Editor**:

```sql
-- Tipos enumerados
CREATE TYPE estado_registro AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE rol_usuario     AS ENUM ('usuario', 'repartidor', 'negocio', 'admin');

-- Tabla de perfiles (extiende auth.users)
CREATE TABLE public.perfiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id),
  nombre           text,
  fecha_nacimiento date,
  rol              rol_usuario DEFAULT 'usuario',
  creado_en        timestamptz DEFAULT now()
);

-- Tabla de calles
CREATE TABLE public.calles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             text NOT NULL,
  latitud            numeric,
  longitud           numeric,
  estado             estado_registro DEFAULT 'pendiente',
  creado_por         uuid REFERENCES public.perfiles(id),
  creado_en          timestamptz DEFAULT now(),
  enlace_google_maps text,
  ruta_json          json
);

-- Tabla de direcciones
CREATE TABLE public.direcciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calle_id    uuid REFERENCES public.calles(id),
  numero      text NOT NULL,
  latitud     numeric NOT NULL,
  longitud    numeric NOT NULL,
  comentario  text,
  estado      estado_registro DEFAULT 'pendiente',
  creado_por  uuid REFERENCES public.perfiles(id),
  creado_en   timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.perfiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direcciones ENABLE ROW LEVEL SECURITY;

-- Políticas: perfiles
CREATE POLICY "perfiles_select_own" ON public.perfiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "perfiles_insert_own" ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "perfiles_update_own" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas: calles
CREATE POLICY "calles_select_aprobadas" ON public.calles FOR SELECT TO anon, authenticated USING (estado = 'aprobado');
CREATE POLICY "calles_select_admin"     ON public.calles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "calles_insert_admin"     ON public.calles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "calles_update_admin"     ON public.calles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "calles_delete_admin"     ON public.calles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));

-- Políticas: direcciones
CREATE POLICY "direcciones_select_own"   ON public.direcciones FOR SELECT TO authenticated USING (creado_por = auth.uid());
CREATE POLICY "direcciones_select_admin" ON public.direcciones FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "direcciones_insert_auth"  ON public.direcciones FOR INSERT TO authenticated WITH CHECK (creado_por = auth.uid());
CREATE POLICY "direcciones_update_admin" ON public.direcciones FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "direcciones_delete_admin" ON public.direcciones FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'));
```

### 3. Asignar el primer admin

Después de registrarte en la app, ejecuta esto en Supabase SQL Editor reemplazando el email:

```sql
UPDATE public.perfiles
SET rol = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tu@email.com'
);
```

### 4. Variables de entorno

Crea el archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Encuéntralas en: **Supabase Dashboard → Settings → API**

### 5. Levantar el servidor de desarrollo

```bash
npm run dev
# http://localhost:5173
```

---

## Estructura del proyecto

```
vh-maps/
├── index.html
├── package.json
├── .env                    ← No commitear (está en .gitignore)
│
└── src/
    ├── main.js             ← Punto de entrada y router
    ├── style.css           ← Estilos globales
    │
    ├── api/
    │   ├── supabase.js     ← Cliente Supabase
    │   ├── auth.js         ← Autenticación y gestión de perfiles
    │   ├── busqueda.js     ← Búsqueda de calles con caché
    │   └── cache.js        ← Caché en localStorage (TTL 24h)
    │
    ├── utils/
    │   ├── map.js          ← Instancia Leaflet y controles
    │   ├── normalizer.js   ← Normalización de nombres de calles
    │   └── toast.js        ← Sistema de notificaciones
    │
    └── ui/
        ├── publicView.js       ← Vista sin login
        ├── loginView.js        ← Login y registro
        ├── roleSelectionView.js← Selección de rol inicial
        ├── userView.js         ← Vista repartidor / negocio
        └── adminView.js        ← Panel de administración
```

---

## Roles

| Rol | Descripción | Acceso |
|---|---|---|
| **Público** | Sin cuenta | Solo buscar calles en el mapa |
| **Repartidor** | Usuario registrado | Buscar calles + registrar direcciones con notas |
| **Negocio** | Usuario registrado | Buscar calles + registrar puntos de interés |
| **Admin** | Asignado manualmente | Todo lo anterior + gestionar calles + aprobar reportes |

Los usuarios se auto-registran y eligen su rol (repartidor o negocio) en el primer login. El rol `admin` solo puede asignarlo otro admin o directamente en la base de datos.

---

## Deploy en Netlify

1. Conecta tu repositorio en [netlify.com](https://netlify.com)
2. Configura las variables de entorno en **Site Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. El build command es `npm run build` y el directorio de publicación es `dist`
4. Cada push a `main` hace deploy automático

---

## Cómo contribuir

¡Las contribuciones son bienvenidas! Antes de empezar, por favor lee lo siguiente.

### Reportar un bug

1. Verifica que el bug no esté ya reportado en [Issues](https://github.com/Alexisjauregui423/VH-Maps-online/issues)
2. Abre un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducirlo
   - Comportamiento esperado vs. actual
   - Capturas de pantalla si aplica
   - Dispositivo y navegador

### Proponer una mejora

Abre un issue con el tag `enhancement` describiendo qué quieres agregar y por qué sería útil para el proyecto.

### Enviar un Pull Request

```bash
# 1. Haz fork del repositorio
# 2. Clona tu fork
git clone https://github.com/Alexisjauregui423/VH-Maps-online.git

# 3. Crea una rama para tu cambio
git checkout -b feature/nombre-descriptivo

# 4. Haz tus cambios y commitea
git commit -m "feat: descripción corta del cambio"

# 5. Push a tu fork
git push origin feature/nombre-descriptivo

# 6. Abre un Pull Request hacia main
```

### Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     cambios en documentación
style:    formato, espacios (sin cambios de lógica)
refactor: refactorización sin cambio de comportamiento
chore:    tareas de mantenimiento
```

### Lo que más necesitamos ahora

- [ ] Invalidación inteligente del caché al detectar cambios en la base de datos
- [ ] Capa visual de todas las calles aprobadas en el mapa público
- [ ] Panel admin para gestionar usuarios y cambiar roles
- [ ] Soporte offline / exportar calles como GeoJSON
- [ ] Traducciones (el código está en español, la UI también)
- [ ] Tests

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más información.

---

## Créditos

- Datos geográficos: [OpenStreetMap](https://www.openstreetmap.org/) contributors
- Rutas automáticas: [OSRM](http://project-osrm.org/)
- Iconos de mapa: [Leaflet](https://leafletjs.com/)
