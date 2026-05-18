import { PDFDocument, PDFImage, StandardFonts, degrees, rgb } from "pdf-lib";
import { functionsClient } from "@/lib/firebase";

type DownloadProtectedPDFParams = {
  originalPdfUrl: string;
  alunoNome?: string;
  alunoCpfOuEmail?: string;
  fileName?: string;
};

const sanitizeFileName = (value?: string) => {
  const baseName = (value || "material-protegido.pdf").trim();
  const withExtension = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
  return withExtension.replace(/[\\/:*?"<>|]+/g, "-");
};

const normalizeIdentity = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "identificacao-nao-informada";
};

const LOGO_CANDIDATES = [
  "/logo.png",
  "/assets/logo.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/7e28a9712547ab2eb527663768a4662a304b619c/suaoab.png",
] as const;

type LogoAsset = {
  bytes: ArrayBuffer;
  format: "png" | "jpg";
};

type RenderableText = {
  content: string;
  usedFallback: boolean;
};

const COLORS = {
  navy: rgb(20 / 255, 35 / 255, 60 / 255),
  graphite: rgb(80 / 255, 80 / 255, 80 / 255),
  bronze: rgb(197 / 255, 160 / 255, 89 / 255),
  offWhite: rgb(249 / 255, 249 / 255, 251 / 255),
  white: rgb(1, 1, 1),
  bronzeSoft: rgb(224 / 255, 213 / 255, 187 / 255),
};

const createRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const top = y + height;

  return [
    `M ${x + safeRadius} ${y}`,
    `L ${right - safeRadius} ${y}`,
    `Q ${right} ${y} ${right} ${y + safeRadius}`,
    `L ${right} ${top - safeRadius}`,
    `Q ${right} ${top} ${right - safeRadius} ${top}`,
    `L ${x + safeRadius} ${top}`,
    `Q ${x} ${top} ${x} ${top - safeRadius}`,
    `L ${x} ${y + safeRadius}`,
    `Q ${x} ${y} ${x + safeRadius} ${y}`,
    "Z",
  ].join(" ");
};

const toAsciiFallback = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");

const getRenderableText = (font: PDFFontLike, text: string, size: number): RenderableText => {
  try {
    font.widthOfTextAtSize(text, size);
    return { content: text, usedFallback: false };
  } catch {
    return { content: toAsciiFallback(text), usedFallback: true };
  }
};

type PDFFontLike = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

const loadLogoAsset = async (): Promise<LogoAsset | null> => {
  for (const logoUrl of LOGO_CANDIDATES) {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) continue;

      return {
        bytes: await response.arrayBuffer(),
        format: logoUrl.toLowerCase().endsWith(".jpg") || logoUrl.toLowerCase().endsWith(".jpeg") ? "jpg" : "png",
      };
    } catch {
      continue;
    }
  }

  return null;
};

const embedLogoImage = async (pdfDoc: PDFDocument, logoAsset: LogoAsset | null): Promise<PDFImage | null> => {
  if (!logoAsset) return null;
  return logoAsset.format === "jpg" ? pdfDoc.embedJpg(logoAsset.bytes) : pdfDoc.embedPng(logoAsset.bytes);
};

const getPdfProxyUrl = (originalPdfUrl: string) => {
  const projectId = functionsClient.app.options.projectId;
  const baseUrl = `https://us-central1-${projectId}.cloudfunctions.net/downloadPdfSource`;
  const proxyUrl = new URL(baseUrl);
  proxyUrl.searchParams.set("url", originalPdfUrl);
  return proxyUrl.toString();
};

const appendMarketingPage = async (pdfDoc: PDFDocument, logoImage: PDFImage | null) => {
  const referencePage = pdfDoc.getPages()[0];
  const referenceSize = referencePage?.getSize();
  const page = referenceSize ? pdfDoc.addPage([referenceSize.width, referenceSize.height]) : pdfDoc.addPage();
  const { width, height } = page.getSize();
  const margin = 25;
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const ctaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: COLORS.offWhite,
  });

  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: COLORS.navy,
    borderWidth: 1.5,
    opacity: 1,
  });

  const contentTop = height - margin - 42;
  const logoScale = logoImage ? Math.min((width * 0.28) / logoImage.width, 0.35) : 0;
  const logoDims = logoImage ? logoImage.scale(logoScale) : null;
  const logoY = contentTop - (logoDims?.height || 0);

  if (logoImage && logoDims) {
    page.drawImage(logoImage, {
      x: width / 2 - logoDims.width / 2,
      y: logoY,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  const title = getRenderableText(titleFont, "MÉTODO ESTRATÉGICO OAB", 24);
  const subtitle = getRenderableText(bodyFont, "A rota mais segura e matemática para conquistar a sua carteira da Ordem.", 13);
  const titleSize = 24;
  const subtitleSize = 13;
  const titleWidth = titleFont.widthOfTextAtSize(title.content, titleSize);
  const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle.content, subtitleSize);
  const titleY = (logoDims ? logoY - 50 : contentTop - 20);
  const subtitleY = titleY - 30;

  page.drawText(title.content, {
    x: width / 2 - titleWidth / 2,
    y: titleY,
    size: titleSize,
    font: titleFont,
    color: COLORS.navy,
  });

  page.drawText(subtitle.content, {
    x: width / 2 - subtitleWidth / 2,
    y: subtitleY,
    size: subtitleSize,
    font: bodyFont,
    color: COLORS.graphite,
  });

  page.drawLine({
    start: { x: width * 0.28, y: subtitleY - 22 },
    end: { x: width * 0.72, y: subtitleY - 22 },
    thickness: 1,
    color: COLORS.bronzeSoft,
    opacity: 0.9,
  });

  const ctaText = getRenderableText(ctaFont, "FAÇA SUA PRÉ-RESERVA EM SUAOAB.COM.BR", 12);
  const ctaFontSize = 12;
  const ctaPaddingX = 26;
  const ctaHeight = 42;
  const ctaTextWidth = ctaFont.widthOfTextAtSize(ctaText.content, ctaFontSize);
  const ctaWidth = ctaTextWidth + ctaPaddingX * 2;
  const ctaX = width / 2 - ctaWidth / 2;
  const ctaY = height * 0.22;
  const ctaRadius = 12;

  page.drawSvgPath(createRoundedRectPath(ctaX, ctaY, ctaWidth, ctaHeight, ctaRadius), {
    color: COLORS.bronze,
    borderColor: COLORS.bronze,
    borderWidth: 1,
  });

  page.drawText(ctaText.content, {
    x: width / 2 - ctaTextWidth / 2,
    y: ctaY + (ctaHeight - ctaFontSize) / 2 + 1,
    size: ctaFontSize,
    font: ctaFont,
    color: COLORS.white,
  });
};

const appendFallbackMarketingPage = async (pdfDoc: PDFDocument) => {
  const referencePage = pdfDoc.getPages()[0];
  const referenceSize = referencePage?.getSize();
  const page = referenceSize ? pdfDoc.addPage([referenceSize.width, referenceSize.height]) : pdfDoc.addPage();
  const { width, height } = page.getSize();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const title = "METODO ESTRATEGICO OAB";
  const subtitle = "A rota mais segura e matematica para conquistar a sua carteira da Ordem.";
  const cta = "FACA SUA PRE-RESERVA EM SUAOAB.COM.BR";

  page.drawRectangle({ x: 0, y: 0, width, height, color: COLORS.offWhite });
  page.drawRectangle({ x: 25, y: 25, width: width - 50, height: height - 50, borderColor: COLORS.navy, borderWidth: 1.5 });
  page.drawText(title, {
    x: width / 2 - titleFont.widthOfTextAtSize(title, 24) / 2,
    y: height * 0.66,
    size: 24,
    font: titleFont,
    color: COLORS.navy,
  });
  page.drawText(subtitle, {
    x: width / 2 - bodyFont.widthOfTextAtSize(subtitle, 13) / 2,
    y: height * 0.6,
    size: 13,
    font: bodyFont,
    color: COLORS.graphite,
  });
  page.drawRectangle({
    x: width / 2 - 155,
    y: height * 0.22,
    width: 310,
    height: 42,
    color: COLORS.bronze,
  });
  page.drawText(cta, {
    x: width / 2 - titleFont.widthOfTextAtSize(cta, 12) / 2,
    y: height * 0.22 + 15,
    size: 12,
    font: titleFont,
    color: COLORS.white,
  });
};

export const downloadProtectedPDF = async ({
  originalPdfUrl,
  alunoNome,
  alunoCpfOuEmail,
  fileName,
}: DownloadProtectedPDFParams) => {
  const [logoAsset, response] = await Promise.all([
    loadLogoAsset(),
    fetch(getPdfProxyUrl(originalPdfUrl)),
  ]);

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Nao foi possivel baixar o PDF original. ${responseText}`.trim());
  }

  const originalPdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await embedLogoImage(pdfDoc, logoAsset).catch(() => null);

  const licensedTo = `Licenciado para: ${normalizeIdentity(alunoNome)} - ${normalizeIdentity(alunoCpfOuEmail)}`;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const watermarkSize = Math.max(22, Math.min(width, height) / 18);
    const footerSize = 10;

    page.drawText(licensedTo, {
      x: width * 0.12,
      y: height * 0.45,
      size: watermarkSize,
      rotate: degrees(35),
      font: helveticaBold,
      color: rgb(0.75, 0.12, 0.12),
      opacity: 0.12,
    });

    page.drawText(licensedTo, {
      x: 24,
      y: 18,
      size: footerSize,
      font: helvetica,
      color: rgb(0.25, 0.25, 0.25),
      opacity: 0.85,
    });
  }

  try {
    await appendMarketingPage(pdfDoc, logoImage);
  } catch (error) {
    console.error("Falha ao gerar pagina premium do PDF. Aplicando fallback.", error);
    await appendFallbackMarketingPage(pdfDoc);
  }

  const protectedPdfBytes = await pdfDoc.save();
  const blob = new Blob([protectedPdfBytes], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = sanitizeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};

export { appendMarketingPage };
