import { supabase } from "@/integrations/supabase/client";

export type CachetType = "carre" | "rond";

const BUCKET = "cachets";
const PATHS: Record<CachetType, string> = {
  carre: "cachet_carre.png",
  rond: "cachet_rond.png",
};

/** Returns a signed URL for the requested stamp (1-hour expiry). */
export async function getCachetUrl(type: CachetType): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(PATHS[type], 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Returns the stamp as a base64 data URL (for embedding in print HTML). */
export async function getCachetBase64(type: CachetType): Promise<string | null> {
  const url = await getCachetUrl(type);
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Applies the square stamp to a PDF stored in Supabase.
 * Returns the stamped PDF as Uint8Array.
 * Throws on failure.
 */
export async function stampPdfInStorage(
  storageBucket: string,
  pdfPath: string,
  cachetType: CachetType = "carre",
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");

  // Fetch source PDF
  const { data: pdfSign } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(pdfPath, 3600);
  if (!pdfSign?.signedUrl) throw new Error("PDF inaccessible");
  const pdfResp = await fetch(pdfSign.signedUrl);
  if (!pdfResp.ok) throw new Error("Impossible de charger le PDF");
  const pdfBytes = await pdfResp.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Fetch stamp image
  const cachetUrl = await getCachetUrl(cachetType);
  if (!cachetUrl) throw new Error("Cachet introuvable — veuillez l'uploader dans les paramètres");
  const imgResp = await fetch(cachetUrl);
  if (!imgResp.ok) throw new Error("Impossible de charger le cachet");
  const imgBytes = await imgResp.arrayBuffer();

  // Embed image (PNG or JPG)
  let stampImg;
  try {
    stampImg = await pdfDoc.embedPng(imgBytes);
  } catch {
    stampImg = await pdfDoc.embedJpg(imgBytes);
  }

  // Add stamp on the last page, bottom-right
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
  const SW = 90;
  const SH = 90;
  lastPage.drawImage(stampImg, {
    x: width - SW - 20,
    y: 20,
    width: SW,
    height: SH,
    opacity: 0.85,
  });

  return pdfDoc.save();
}

/**
 * Injects the square stamp into an HTML string.
 * If the HTML contains <!-- CACHET --> it replaces that marker (precise placement).
 * Otherwise falls back to inserting before </body>.
 */
export async function injectCachetInHtml(html: string): Promise<string> {
  const b64 = await getCachetBase64("carre").catch(() => null);
  if (!b64) return html;
  const img = `<img src="${b64}" style="width:110px;height:110px;object-fit:contain;opacity:0.85;display:block;" alt="Cachet officiel" />`;
  if (html.includes("<!-- CACHET -->")) {
    return html.replace("<!-- CACHET -->", img);
  }
  const fallback = `<div style="display:flex;justify-content:flex-end;margin-top:16px;page-break-inside:avoid;">${img}</div>`;
  return html.replace("</body>", `${fallback}</body>`);
}
