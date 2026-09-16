# CMS Seguros — Plan de implementación por sprints (MVP)

Basado en `2026-09-16-cms-seguros-mvp-design.md`. Sprints de ~1 semana, cada uno termina en algo demostrable.

## Sprint 0 — Setup del proyecto
- Scaffold Vite + React + TypeScript.
- Crear proyecto Firebase (Firestore, Auth, Storage, Hosting).
- Configurar variables de entorno (`.env`) y conexión al SDK de Firebase.
- Reglas de seguridad iniciales de Firestore/Storage (solo el usuario admin autenticado puede leer/escribir).
- **Verificación**: `npm run dev` levanta la app y conecta a Firebase sin errores en consola.

## Sprint 1 — Login y estructura base
- Pantalla de login con Firebase Auth (email/password).
- Layout base de la app (nav, rutas protegidas).
- Modelo de datos en Firestore: colecciones `clientes` y subcolección `polizas`.
- **Verificación**: solo un usuario autenticado puede entrar; usuario no autenticado es redirigido al login.

## Sprint 2 — CRUD de clientes y pólizas
- Lista de clientes en tarjetas (agrupando pólizas por cliente).
- Ficha de cliente: crear/editar datos personales.
- Crear/editar/eliminar pólizas dentro de un cliente (aseguradora, tipo, detalle del bien, número, vigencia, prima, observaciones).
- Buscador por nombre, cédula, aseguradora o número de póliza.
- **Verificación**: crear un cliente con 2 pólizas manualmente, buscarlo por cada campo indexado y confirmar que aparece.

## Sprint 3 — Documentos por póliza
- Subida de documentos a Firebase Storage, asociados a una póliza.
- Validación de tipo de archivo (PDF/JPG/PNG) y tamaño máximo.
- Vista/descarga y eliminación de documentos en la ficha de la póliza.
- **Verificación**: subir un PDF válido funciona; subir un `.exe` se rechaza con mensaje de error y no afecta documentos ya subidos.

## Sprint 4 — Dashboard de renovaciones
- Pantalla de entrada tras login: pólizas con vigencia ≤30 días, ordenadas por fecha más próxima.
- Badge de alerta visible también en la lista de clientes.
- **Verificación**: una póliza a 29 días aparece en el dashboard; una a 31 días no aparece.

## Sprint 5 — Importación masiva desde Excel
- Subida de archivo .xlsx/.csv.
- Pantalla de mapeo de columnas (Cliente, Compañía, Tipo de Producto, Número de Póliza, Vigencia, Prima, Observaciones).
- Agrupación de filas por nombre exacto de cliente.
- Previsualización antes de confirmar.
- Manejo de errores: filas sin cliente/número de póliza o con fecha mal formateada se reportan sin detener el resto de la importación.
- **Verificación**: importar un Excel de prueba con filas válidas + 1 sin cliente + 1 sin número de póliza + 1 con fecha mal formateada → resumen final reporta exactamente esos 3 errores y el resto queda guardado agrupado por cliente.

## Sprint 6 — Pulido y despliegue
- Revisión de usabilidad ("friendly", botones grandes, texto legible — pensado para un usuario de 50 años).
- Pruebas manuales de los flujos completos (login → buscar cliente → ver póliza → ver documento; importar Excel real de la agencia).
- Deploy a Firebase Hosting.
- **Verificación**: flujo completo probado en escritorio y en celular.

## Fuera de alcance (fases futuras, no de este plan)
- Extracción automática de datos desde el PDF de la póliza al crear un cliente.
- Múltiples usuarios/agentes con permisos separados.
- Coincidencia difusa de nombres duplicados al importar.
