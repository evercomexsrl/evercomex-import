# Inventario de Importaciones (Supabase + Netlify)

## En Supabase
1. Crea un proyecto en supabase.com.
2. SQL Editor > New query > pega TODO `supabase/01_schema.sql` > Run.
3. Authentication > Providers > Email: desactiva **Confirm email** (necesario para crear usuarios desde la app).
4. Authentication > Users > Add user: tu correo y contraseña, marca **Auto Confirm User**.
5. SQL Editor: abre `supabase/02_admin.sql`, cambia `TU_CORREO@ejemplo.com` por tu correo > Run. Ya eres administrador.
6. Project Settings > API: copia **Project URL** y la clave **anon / publishable**.
7. Buckets: esta versión no usa archivos, no hay que crear ninguno.

## En Netlify
1. Sube esta carpeta a GitHub y en Netlify: Add new site > Import from Git (o arrastra la carpeta compilada `dist`).
2. Site settings > Environment variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. El archivo `public/_redirects` ya evita errores 404 al recargar.

## Local
`cp .env.example .env`, completa las 2 variables, `npm install`, `npm run dev`.
