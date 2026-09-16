# CMS Seguros — Diseño MVP (Fase 1)

## Contexto

CMS web para un broker/agencia de seguros independiente en Panamá. Hoy la cartera de clientes se lleva en un Excel (una fila por póliza) y los documentos se guardan en carpetas por cliente en la PC. El objetivo de esta fase es centralizar esa cartera con búsqueda rápida, alertas de renovación y documentos por póliza, además de poder importar el Excel existente en bloque.

Fuera de esta fase: extracción automática de datos desde el PDF de la póliza, múltiples usuarios/agentes con permisos separados, y coincidencia difusa de nombres duplicados al importar (queda para una fase futura).

## Stack

- **Frontend**: React + TypeScript, bundler Vite. Web app responsive (un solo código para escritorio y celular, sin apps nativas).
- **Backend/datos**: Firebase — Firestore (base de datos), Firebase Auth (login), Firebase Storage (documentos).
- **Hosting**: Firebase Hosting.

## Modelo de datos (Firestore)

```
clientes/{clienteId}
  - nombre: string
  - cedula: string
  - telefono: string
  - email: string (opcional)

clientes/{clienteId}/polizas/{polizaId}
  - aseguradora: string
  - tipoSeguro: string (catálogo fijo, ver abajo)
  - detalleBien: string (texto libre — ej. "Toyota Corolla 2020, placa AB1234")
  - numeroPoliza: string
  - vigenciaInicio: date
  - vigenciaFin: date
  - prima: number
  - observaciones: string

clientes/{clienteId}/polizas/{polizaId}/documentos/{docId}
  - nombreArchivo: string
  - tipoDocumento: enum (cedula | licencia | registroVehicular | proforma | cotizacion | poliza | endoso | kyc | otro)
  - urlStorage: string
  - fechaSubida: timestamp
```

Los documentos cuelgan de la póliza (no del cliente en general), según lo confirmado con el usuario.

**Catálogo fijo `tiposSeguro`**: Auto, Daños a Terceros, Incendio, Contenido, Vida, Accidentes Personales, Salud, Responsabilidad Civil, Fianza, Equipo Pesado, Otro.

## Pantallas (Fase 1)

1. **Login** — solo un usuario administrador (sin roles ni multiusuario en esta fase).
2. **Dashboard de renovaciones** — pantalla de entrada tras login. Lista las pólizas que vencen en los próximos 30 días, ordenadas por fecha de vencimiento más próxima primero.
3. **Lista de clientes** — vista de tarjetas (una tarjeta por cliente, agrupando todas sus pólizas). Buscador por nombre, cédula, aseguradora o número de póliza. Cada póliza dentro de la tarjeta muestra un badge de alerta si vence en ≤30 días.
4. **Ficha de cliente** — datos personales (nombre, cédula, teléfono, email), lista de pólizas con crear/editar, y documentos por póliza (subir, ver, eliminar).
5. **Importar Excel** — flujo de 4 pasos:
   1. Subir archivo (.xlsx/.csv).
   2. Mapear columnas del archivo a los campos del sistema (Cliente, Compañía de Seguros, Tipo de Producto, Número de Póliza, Vigencia, Prima, Observaciones).
   3. Agrupar filas por **nombre exacto de cliente** (dos filas con el mismo texto en la columna Cliente se agrupan bajo el mismo registro de cliente).
   4. Previsualizar el resultado y confirmar antes de guardar en Firestore.

## Manejo de errores y casos borde

- **Importación**: filas sin cliente o sin número de póliza se marcan como error y no se importan; el resto de la importación continúa. Al final se muestra un resumen (ej. "18 pólizas importadas, 2 con error — ver detalle").
- **Fechas de vigencia mal formateadas** en el Excel: la fila se reporta como error de formato mostrando el valor original, sin detener el resto de la importación.
- **Documentos**: se valida tipo de archivo permitido (PDF, JPG, PNG) y tamaño máximo antes de subir a Storage; un archivo rechazado muestra el motivo y no bloquea la subida de otros documentos.
- **Nombres de cliente casi iguales pero no idénticos** (ej. "Juan Perez" vs "Juan Pérez") no se agrupan automáticamente en esta fase — quedan como clientes separados; se puede fusionar manualmente más adelante (fuera de alcance de Fase 1 el hacerlo automático).

## Pruebas

- Prueba de importación: un Excel de muestra con filas válidas, una fila sin cliente, una fila sin número de póliza, y una fecha de vigencia mal formateada — verificar que el resumen final reporta los 3 casos de error y que las filas válidas sí se guardan agrupadas por cliente.
- Prueba de alertas: una póliza con `vigenciaFin` a 29 días debe aparecer en el dashboard de renovaciones; una a 31 días no debe aparecer.
- Prueba de documentos: subir un archivo de tipo no permitido (ej. .exe) debe rechazarse con mensaje de error sin afectar documentos ya subidos.
