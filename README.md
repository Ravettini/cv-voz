# CV Voz

Aplicación web para crear un CV profesional conversando por voz o texto con un asistente basado en Gemini.

## Requisitos

- Node.js 20+
- Cuenta de Supabase (Auth + Postgres + Storage)
- API Key de Gemini

## Instalación

```bash
npm install
```

Copiá variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Variables de entorno

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_LIVE_MODEL=gemini-3.5-live-translate-preview
GEMINI_OUTPUT_VOICE=Kore

DEMO_MODE=false
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca uses `VITE_GEMINI_API_KEY`. La key de Gemini vive solo en Express.

## Supabase

1. Creá un proyecto.
2. Ejecutá la migración `supabase/migrations/001_initial.sql` en el SQL Editor.
3. Activá Auth email/password.
4. Confirmá que el bucket `profile-photos` quedó creado (la migración lo inserta).

## Gemini

1. Creá una API key en Google AI Studio.
2. Pegala en `GEMINI_API_KEY`.
3. Ajustá `GEMINI_TEXT_MODEL` y `GEMINI_LIVE_MODEL` si querés cambiar modelos.

Si falta la key, la API responde claramente: **Gemini no está configurado.**

Para desarrollo local sin key (solo contenido simulado):

```env
DEMO_MODE=true
```

No activar `DEMO_MODE` en producción.

## Desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Build

```bash
npm run build
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
```
