# Quiniela Gnecchi Mundial 2026 ⚽

> Predice. Compite. Diviértete.

---

## 🚀 Guía para publicar hoy (sin saber programar)

Sigue estos pasos EN ORDEN. Cada uno toma pocos minutos.

---

### PASO 1 — Crear cuenta en Supabase (5 min)

1. Ve a **https://supabase.com**
2. Clic en "Start your project" → registrate con Google o correo
3. Clic en "New project"
4. Ponle nombre: `quiniela-gnecchi`
5. Elige una contraseña (guárdala)
6. Región: `US East` (más rápida para México)
7. Espera ~2 minutos a que cargue

---

### PASO 2 — Crear las tablas en Supabase (3 min)

1. En tu proyecto Supabase, clic en "SQL Editor" (menú izquierdo)
2. Clic en "New query"
3. Abre el archivo **`supabase-setup.sql`** de esta carpeta
4. Copia TODO el texto (Ctrl+A, Ctrl+C)
5. Pégalo en el editor de Supabase (Ctrl+V)
6. Clic en el botón verde "Run" (o Ctrl+Enter)
7. Debe aparecer "Success. No rows returned" ✅

---

### PASO 3 — Obtener las claves de Supabase (2 min)

1. En Supabase, clic en "Settings" (ícono de engrane, menú izquierdo)
2. Clic en "API"
3. Copia estos dos valores:
   - **Project URL** → algo como `https://abcxyz.supabase.co`
   - **anon public** (bajo "Project API keys")

---

### PASO 4 — Subir el código a GitHub (5 min)

1. Ve a tu cuenta de GitHub → "New repository"
2. Nombre: `quiniela-gnecchi`
3. Marca "Private" (para que sea privada)
4. Clic "Create repository"
5. Arrastra TODA esta carpeta al repositorio
6. Clic "Commit changes"

---

### PASO 5 — Publicar en Vercel (5 min)

1. Ve a **https://vercel.com** → registrate con tu cuenta de GitHub
2. Clic "New Project"
3. Selecciona tu repositorio `quiniela-gnecchi`
4. Antes de hacer clic en "Deploy", busca "Environment Variables"
5. Agrega estas dos variables:

   | Nombre | Valor |
   |--------|-------|
   | `VITE_SUPABASE_URL` | Tu Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

6. Clic "Deploy"
7. Espera ~2 min → ¡Vercel te da un enlace público! 🎉

---

### PASO 6 — Hacerte administrador (1 min)

1. Entra a tu nueva página y **regístrate** con tu correo
2. Ve a Supabase → SQL Editor → New query
3. Pega este texto (con TU correo):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'TU@CORREO.COM';
```

4. Clic "Run" ✅
5. Cierra sesión y vuelve a entrar → verás el botón "Panel admin"

---

### PASO 7 — Compartir con la familia

Comparte el enlace de Vercel por WhatsApp. Ejemplo:
> "¡Ya está la quiniela! Regístrate aquí: https://quiniela-gnecchi.vercel.app
> Tienes hasta mañana para registrar tus pronósticos ⚽🏆"

---

## 📱 Cómo usar como admin

- **Abrir/cerrar fase**: Panel admin → Configuración → Activa/desactiva la fase de grupos
- **Ingresar resultados**: Panel admin → Resultados → selecciona ganador de cada partido → Guardar
- Los puntos se calculan automáticamente

---

## ❓ Problemas comunes

**"Error: supabaseUrl is required"**
→ Las variables de entorno no se configuraron bien. Ve a Vercel → Settings → Environment Variables y verifica que están correctas.

**La página no carga**
→ Espera 2-3 min después del deploy. Si sigue fallando, ve a Vercel → Deployments → revisa el log de errores.

**No puedo registrarme**
→ Ve a Supabase → Authentication → Providers → Email y verifica que está habilitado.

---

## 🎨 Colores de la app

- Fondo: Negro `#0a0a0a`
- Azul principal: `#0299fc`
- Azul cobalto: `#244ffe`
- Azul cielo: `#2596be`
