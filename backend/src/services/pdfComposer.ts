import { PDFDocument } from 'pdf-lib';

export interface Marker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  type: string;
  signed: boolean;
  signature?: string | null;
  signedAt?: Date | string | null;
  assignedTo: {
    name: string;
    email: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Converts top-left CSS coordinates (captured at scale 1.2) to bottom-left PDF point coordinates (scale 1.0).
 *
 * @param marker The marker object containing top-left pixel values (from zoomScale=1.2).
 * @param pageWidthPt The target page width in PDF points.
 * @param pageHeightPt The target page height in PDF points.
 */
export function convertMarkerToPdfCoords(
  marker: { x: number; y: number; width: number; height: number },
  pageWidthPt: number,
  pageHeightPt: number
) {
  const BASE_PDF_SCALE = 1.2;

  // 1. Convert scale 1.2 CSS pixels to scale 1.0 PDF points
  const width = marker.width / BASE_PDF_SCALE;
  const height = marker.height / BASE_PDF_SCALE;
  const x = marker.x / BASE_PDF_SCALE;
  const y = marker.y / BASE_PDF_SCALE;

  // 2. Flip the Y-axis: y_bottom_left = pageHeight - y_top_left - height_of_box
  const pdfX = x;
  const pdfY = pageHeightPt - y - height;

  return {
    x: pdfX,
    y: pdfY,
    width,
    height,
  };
}

/**
 * Loads original PDF buffer, draws signed markers (signatures and visible audit metadata), and returns the signed PDF buffer.
 */
export async function compositeSignatures(
  originalPdfBuffer: Buffer,
  markers: Marker[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();

  for (const marker of markers) {
    // Only composite signed markers with signature images
    if (!marker.signed || !marker.signature || marker.page < 1 || marker.page > pages.length) {
      continue;
    }

    const pageIndex = marker.page - 1;
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // 1. Convert coordinates
    const coords = convertMarkerToPdfCoords(marker, pageWidth, pageHeight);

    // 2. Parse signature image base64
    const base64Data = marker.signature.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    // 3. Embed image based on MIME type
    let signatureImage;
    if (marker.signature.includes('image/jpeg') || marker.signature.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(imgBuffer);
    } else {
      signatureImage = await pdfDoc.embedPng(imgBuffer);
    }

    // 4. Draw signature image onto the page
    page.drawImage(signatureImage, {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}
