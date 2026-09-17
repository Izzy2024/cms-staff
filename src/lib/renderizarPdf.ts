import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Renderiza las primeras páginas de un PDF a data-URLs JPEG.
 * DeepSeek no acepta PDF directo (solo imágenes), por eso se
 * rasteriza en el navegador antes de enviar a la Edge Function.
 */
export async function renderizarPaginasComoImagenes(
  archivo: File,
  maxPaginas = 5,
): Promise<string[]> {
  const buffer = await archivo.arrayBuffer();
  const tarea = pdfjsLib.getDocument({ data: buffer });
  const pdf = await tarea.promise;

  const total = Math.min(pdf.numPages, maxPaginas);
  const imagenes: string[] = [];

  for (let i = 1; i <= total; i++) {
    const pagina = await pdf.getPage(i);
    const viewport = pagina.getViewport({ scale: 1.75 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      throw new Error(
        "No se pudo analizar el documento. Intente de nuevo o cargue los datos manualmente.",
      );
    }
    await pagina.render({ canvas, viewport }).promise;
    imagenes.push(canvas.toDataURL("image/jpeg", 0.85));
    await pagina.cleanup();
  }

  await tarea.destroy();
  return imagenes;
}
