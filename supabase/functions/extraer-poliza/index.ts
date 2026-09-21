const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIPOS_SEGURO = [
  "Auto",
  "Daños a Terceros",
  "Incendio",
  "Contenido",
  "Vida",
  "Accidentes Personales",
  "Salud",
  "Responsabilidad Civil",
  "Fianza",
  "Equipo Pesado",
  "Asistencia Viajera",
  "Otro",
];

const INSTRUCCION = `Analiza las imágenes de una póliza de seguro y extrae los datos.
Responde SOLO con un objeto JSON estricto, sin prosa ni markdown, con esta forma exacta:
{
  "cliente": { "nombre": string, "cedula": string, "telefono": string, "email": string },
  "poliza": {
    "aseguradora": string,
    "tipoSeguro": string,
    "detalleBien": string,
    "numeroPoliza": string,
    "vigenciaInicio": string,
    "vigenciaFin": string,
    "prima": number,
    "observaciones": string,
    "beneficios": string,
    "coberturaAuto": string,
    "frecuenciaPago": string,
    "conductoPago": string,
    "diaPago": string,
    "numeroCuotas": number
  },
  "avisos": string[]
}
Reglas:
- "tipoSeguro" debe ser EXACTAMENTE uno de: ${TIPOS_SEGURO.map((t) => `"${t}"`).join(", ")}. Si no hay certeza, usa "Otro".
- "coberturaAuto": para seguros de auto, debe ser EXACTAMENTE uno de: "Cobertura completa", "Solo a terceros". Si la póliza es de Responsabilidad Civil, daños a terceros o seguro obligatorio, usa "Solo a terceros". Si es cobertura completa / comprensiva / colisión y vuelco, usa "Cobertura completa". Si no es auto o no se detecta, usa "" y agrégalo a "avisos".
- "frecuenciaPago": debe ser EXACTAMENTE uno de: "Anual", "Semestral", "Trimestral", "Mensual". Si el documento indica "pagos mensuales", "mensual" o mensualidades (ej. "Dos (2) pagos mensuales"), usa "Mensual". Si indica semestral, "Semestral". Si indica trimestral, "Trimestral". Si es anual o pago único, "Anual". Si no se detecta, usa "" y agrégalo a "avisos".
- "conductoPago": debe ser EXACTAMENTE uno de: "Voluntaria", "TCR", "ACH". Si en el documento indica "Descuento de tarjeta de credito", tarjeta de crédito o similar, mapear a "TCR". Si es débito bancario o ACH, mapear a "ACH". Si es pago directo, en ventanilla o voluntario, mapear a "Voluntaria". Si no se detecta, usa "" y agrégalo a "avisos".
- "diaPago": texto libre con el día de pago o fecha estipulada (ej. "21 del mes correspondiente"). Si no se detecta, usa "" y agrégalo a "avisos".
- "numeroCuotas": número entero de cuotas (mínimo 1). Si indica "Dos (2) pagos mensuales" o "2 cuotas", es 2. Si es pago único anual, es 1. Si no se detecta, usa 1 y agrégalo a "avisos".
- "prima" es el monto ANUAL TOTAL que paga el cliente (con impuestos si aplica), como número, no string.
- Las fechas en formato YYYY-MM-DD.
- "beneficios" es un resumen en texto plano tipo lista de las coberturas/beneficios del documento.
- Campo no encontrado: si no se detecta algún campo, usar "" o 1 (para numeroCuotas) o 0 (para prima) y agregarlo a "avisos" explicando cuál campo no se encontró.`;

function limpiarJson(texto: string): string {
  let limpio = texto.trim();
  const match = limpio.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) limpio = match[1].trim();
  return limpio;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido. Use POST." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo de la solicitud inválido. Se esperaba JSON con { imagenes }." }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const imagenes = (body as { imagenes?: unknown })?.imagenes;
  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    return new Response(
      JSON.stringify({ error: "No se recibieron imágenes del documento para analizar." }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Falta configurar la clave DEEPSEEK_API_KEY en el servidor." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  let respuestaDeepSeek: Response;
  try {
    respuestaDeepSeek = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: INSTRUCCION },
              ...imagenes.map((imagen) => ({
                type: "image_url",
                image_url: { url: imagen },
              })),
            ],
          },
        ],
      }),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "No se pudo contactar el servicio de análisis. Intente de nuevo." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (!respuestaDeepSeek.ok) {
    return new Response(
      JSON.stringify({ error: "El servicio de análisis devolvió un error. Intente de nuevo." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  let contenido = "";
  try {
    const datos = await respuestaDeepSeek.json();
    contenido = datos?.choices?.[0]?.message?.content ?? "";
    if (!contenido) throw new Error("vacío");
  } catch {
    return new Response(
      JSON.stringify({ error: "El servicio de análisis devolvió una respuesta inválida. Intente de nuevo." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const resultado = JSON.parse(limpiarJson(contenido));
    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "No se pudo interpretar la respuesta del análisis. Intente de nuevo." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
