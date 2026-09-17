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
    "beneficios": string
  },
  "avisos": string[]
}
Reglas:
- "tipoSeguro" debe ser EXACTAMENTE uno de: ${TIPOS_SEGURO.map((t) => `"${t}"`).join(", ")}. Si no hay certeza, usa "Otro".
- "prima" es el monto ANUAL TOTAL que paga el cliente (con impuestos si aplica), como número, no string.
- Las fechas en formato YYYY-MM-DD.
- "beneficios" es un resumen en texto plano tipo lista de las coberturas/beneficios del documento.
- Campo no encontrado: usa "" o 0 (para prima) y agrega una línea en "avisos" explicando cuál campo no se encontró.`;

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
