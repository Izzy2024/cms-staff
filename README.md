# CMS Seguros

CMS para gestión de clientes y pólizas de seguros, con extracción de datos desde PDF asistida por IA.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (base de datos y auth)
- React Router, React Hook Form + Zod, TanStack Query

## Setup

```bash
npm install
cp .env.example .env   # completar variables de entorno
npm run dev
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — lint con oxlint
- `npm run preview` — preview del build

## Estructura

- `src/pages` — vistas (dashboard, clientes, importación, login)
- `src/components` — componentes de UI
- `src/auth` — autenticación
- `src/lib` — utilidades y clientes (Supabase, etc.)
- `supabase/` — migraciones y config de Supabase
