# Configuración pendiente — CMS Seguros

Checklist de lo que falta configurar fuera del código. Proyecto Supabase: `sqewjcjgyyjjygeberxf`.

---

## 1. Correo propio (SMTP) — necesario para invitar usuarios

El correo integrado de Supabase solo sirve para pruebas (envía muy pocos correos por hora). Sin SMTP propio, las invitaciones y la recuperación de contraseña no son confiables.

**Proveedor sugerido:** [Resend](https://resend.com) o [Brevo](https://www.brevo.com) (ambos gratis a bajo volumen).

- [ ] Crear cuenta en el proveedor.
- [ ] Verificar el dominio del remitente agregando los registros DNS que pida el proveedor (SPF y DKIM). Sin esto los correos caen en spam.
- [ ] Supabase → **Authentication → Emails → SMTP Settings** → activar *Enable custom SMTP* y completar:

| Campo | Resend | Brevo |
|---|---|---|
| Host | `smtp.resend.com` | `smtp-relay.brevo.com` |
| Port | `465` | `587` |
| Username | `resend` | el *SMTP login* de Brevo |
| Password | la API key de Resend | la *SMTP key* de Brevo |
| Sender email | `no-responder@tudominio.com` (del dominio verificado) | igual |
| Sender name | `CMS Seguros` | igual |

- [ ] Revisar **Authentication → Rate Limits** → límite de correos por hora (con SMTP propio se puede subir).

## 2. Plantillas de correo

Supabase → **Authentication → Emails → Templates**. La app espera que los enlaces lleguen a `/definir-contrasena` con `token_hash` y `type`.

- [ ] **Invite user** — reemplazar el enlace por:

```html
<h2>Invitación a CMS Seguros</h2>
<p>Le invitaron a usar CMS Seguros. Defina su contraseña para empezar:</p>
<p><a href="{{ .SiteURL }}/definir-contrasena?token_hash={{ .TokenHash }}&type=invite">Aceptar invitación</a></p>
```

- [ ] **Reset Password** — reemplazar el enlace por:

```html
<h2>Restablecer contraseña</h2>
<p>Recibimos una solicitud para cambiar su contraseña. Si no fue usted, ignore este correo.</p>
<p><a href="{{ .SiteURL }}/definir-contrasena?token_hash={{ .TokenHash }}&type=recovery">Definir nueva contraseña</a></p>
```

## 3. URLs de autenticación

Supabase → **Authentication → URL Configuration**. Sin esto los enlaces de los correos apuntan a una dirección equivocada.

- [ ] **Site URL**: `http://localhost:5173` mientras se prueba en local → cambiar al dominio real al desplegar (ej. `https://app.tudominio.com`).
- [ ] **Redirect URLs**: agregar `http://localhost:5173/**` y, al desplegar, `https://app.tudominio.com/**`.

## 4. Invitar un usuario nuevo (cada vez)

El registro público está cerrado a propósito. Los usuarios se crean solo por invitación y **necesitan el rol `agente`** o no verán ningún dato (lo exige la seguridad de la base de datos).

1. Supabase → **Authentication → Users → Invite user** → escribir el correo.
2. Asignar el rol en **SQL Editor**:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"agente"}'
   where email = 'correo@del-usuario.com';
   ```

3. El usuario abre el correo → define su contraseña → entra.
4. Si ya había iniciado sesión antes de asignarle el rol, debe **cerrar sesión y volver a entrar**.

- [ ] Probar el flujo completo una vez con un correo propio (quedó pendiente al cerrar el Sprint A).

## 5. Al desplegar a internet

**Supabase**
- [ ] Pasar a plan **Pro** (USD 25/mes): el plan Free se pausa tras 7 días sin uso y no tiene backups automáticos. Con datos reales de clientes no es opcional.
- [ ] Con Pro, activar **Prevent use of leaked passwords** (Authentication → Sign In / Providers → Email).
- [ ] Confirmar que el secreto `DEEPSEEK_API_KEY` sigue configurado en Edge Functions → Secrets (ya existe; solo hace falta si se crea otro proyecto).

**Hosting del frontend (sugerido: Cloudflare Pages o Netlify, gratis y con uso comercial permitido)**

> Vercel Hobby no sirve para una app comercial (sus términos lo prohíben); Vercel Pro cuesta USD 20/mes.

- [ ] Conectar el repositorio de GitHub.
- [ ] Build command: `npm run build` · Output directory: `dist`.
- [ ] Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (mismos valores que `.env`; son públicas por diseño, la seguridad la da la base de datos).
- [ ] Fallback de SPA para que recargar `/clientes/123` no dé 404: en Cloudflare Pages es automático; en Netlify crear `public/_redirects` con `/* /index.html 200`.
- [ ] Cabeceras de seguridad en `public/_headers` (`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- [ ] Conectar el dominio propio.
- [ ] Volver a la sección 3 y cambiar Site URL / Redirect URLs al dominio real.
- [ ] Probar en producción: login, invitar usuario, recuperar contraseña, subir PDF, importar Excel.

**Opcional**
- [ ] [Sentry](https://sentry.io) (gratis) para enterarse de errores que ocurran en el navegador de los usuarios.

---

## Referencia rápida

- **Regenerar la foto del esquema** (`supabase/schema.sql`):

  ```bash
  supabase db dump --linked --schema public --dry-run < /dev/null 2>/dev/null | PATH=/opt/homebrew/opt/libpq/bin:$PATH bash > supabase/schema.sql
  ```

- **Verificar que el registro público sigue cerrado**: `curl "$VITE_SUPABASE_URL/auth/v1/settings" -H "apikey: $VITE_SUPABASE_ANON_KEY"` debe mostrar `"disable_signup": true`.
