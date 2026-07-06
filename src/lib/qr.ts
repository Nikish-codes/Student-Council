import QRCode from "qrcode";

/**
 * Render a QR code as an inline SVG string (no <img>, no network). The returned
 * markup is injected via dangerouslySetInnerHTML on the server-rendered ticket.
 * Error-correction level "M" tolerates a logo/overlay and print smudging.
 */
export async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
  });
}
