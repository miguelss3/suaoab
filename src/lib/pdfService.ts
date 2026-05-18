import { PDFArray, PDFDict, PDFDocument, PDFImage, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";
import { functionsClient } from "@/lib/firebase";
import heroBg from "@/assets/hero-bg.jpg";

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

const LOGO_CANDIDATES = [
  "/logo.png",
  "/assets/logo.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/7e28a9712547ab2eb527663768a4662a304b619c/suaoab.png",
] as const;

const PROMO_IMAGE_CANDIDATES = [
  heroBg,
  "https://raw.githubusercontent.com/miguelss3/suaoab/8a53302fe24efc4cc5b67e65927b2c7028614709/oab%20carteira.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/2554b51a49f66817c4b13774198a0124db93f1bb/imagemcorrecao.png",
] as const;

const SYMBOL_CANDIDATES = [
  "https://raw.githubusercontent.com/miguelss3/suaoab/e807c98a9df0bd4326f0f7d2f1db69ab8e82808f/suaoabnovosemfundo.png",
] as const;

type LogoAsset = {
  bytes: ArrayBuffer;
  format: "png" | "jpg";
};

const ASSET_FETCH_TIMEOUT_MS = 1800;
const imageAssetCache = new Map<string, Promise<LogoAsset | null>>();

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

const inferImageFormat = (assetUrl: string): "png" | "jpg" =>
  /\.jpe?g($|\?)/i.test(assetUrl) ? "jpg" : "png";

const toAsciiFallback = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss");

const wrapText = (font: PDFFontLike, text: string, size: number, maxWidth: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const getImageFit = (image: PDFImage, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return image.scale(scale);
};

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

const loadImageAsset = async (candidates: readonly string[]): Promise<LogoAsset | null> => {
  const cacheKey = candidates.join("|");
  const cachedAsset = imageAssetCache.get(cacheKey);
  if (cachedAsset) {
    return cachedAsset;
  }

  const assetPromise = (async () => {
  for (const assetUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
      const response = await fetch(assetUrl, { signal: controller.signal, cache: "force-cache" });
      window.clearTimeout(timeoutId);
      if (!response.ok) continue;

      return {
        bytes: await response.arrayBuffer(),
        format: inferImageFormat(assetUrl),
      };
    } catch {
      continue;
    }
  }

  return null;
  })();

  imageAssetCache.set(cacheKey, assetPromise);
  return assetPromise;
};

const loadLogoAsset = () => loadImageAsset(LOGO_CANDIDATES);

const loadPromoImageAsset = () => loadImageAsset(PROMO_IMAGE_CANDIDATES);

const loadSymbolAsset = () => loadImageAsset(SYMBOL_CANDIDATES);

void loadLogoAsset();
void loadPromoImageAsset();
void loadSymbolAsset();

const embedImageAsset = async (pdfDoc: PDFDocument, imageAsset: LogoAsset | null): Promise<PDFImage | null> => {
  if (!imageAsset) return null;
  return imageAsset.format === "jpg" ? pdfDoc.embedJpg(imageAsset.bytes) : pdfDoc.embedPng(imageAsset.bytes);
};

const addLinkAnnotation = (
  pdfDoc: PDFDocument,
  page: { ref: unknown },
  x: number,
  y: number,
  width: number,
  height: number,
  url: string
) => {
  const linkAnnotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    C: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    },
  });

  const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
  const pageNode = pdfDoc.context.lookup(page.ref as never) as PDFDict;
  const annotsKey = PDFName.of("Annots");
  const existingAnnots = pageNode.get(annotsKey);

  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(linkAnnotationRef);
    return;
  }

  const annots = pdfDoc.context.obj([linkAnnotationRef]);
  pageNode.set(annotsKey, annots);
};

const getPdfProxyUrl = (originalPdfUrl: string) => {
  const projectId = functionsClient.app.options.projectId;
  const baseUrl = `https://us-central1-${projectId}.cloudfunctions.net/downloadPdfSource`;
  const proxyUrl = new URL(baseUrl);
  proxyUrl.searchParams.set("url", originalPdfUrl);
  return proxyUrl.toString();
};

const appendMarketingPage = async (
  pdfDoc: PDFDocument,
  logoImage: PDFImage | null,
  promoImage: PDFImage | null,
  symbolImage: PDFImage | null
) => {
  const referencePage = pdfDoc.getPages()[0];
  const referenceSize = referencePage?.getSize();
  const page = referenceSize ? pdfDoc.addPage([referenceSize.width, referenceSize.height]) : pdfDoc.addPage();
  const { width, height } = page.getSize();
  const margin = 25;
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const ctaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const eyebrowFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

  page.drawLine({
    start: { x: margin + 8, y: height - margin - 10 },
    end: { x: width - margin - 8, y: height - margin - 10 },
    thickness: 2,
    color: COLORS.bronze,
  });

  const contentTop = height - margin - 52;
  const logoScale = logoImage ? Math.min((width * 0.24) / logoImage.width, 0.32) : 0;
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

  const eyebrow = getRenderableText(eyebrowFont, "PLATAFORMA OFICIAL SUAOAB", 10);
  const eyebrowWidth = eyebrowFont.widthOfTextAtSize(eyebrow.content, 10);
  const title = getRenderableText(titleFont, "MÉTODO ESTRATÉGICO OAB", 24);
  const subtitle = getRenderableText(bodyFont, "A rota mais segura e matemática até a aprovação do Exame da OAB.", 13);
  const titleSize = 24;
  const subtitleSize = 13;
  const eyebrowY = (logoDims ? logoY - 26 : contentTop + 10);
  const titleWidth = titleFont.widthOfTextAtSize(title.content, titleSize);
  const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle.content, subtitleSize);
  const titleY = eyebrowY - 26;
  const subtitleY = titleY - 30;

  page.drawText(eyebrow.content, {
    x: width / 2 - eyebrowWidth / 2,
    y: eyebrowY,
    size: 10,
    font: eyebrowFont,
    color: COLORS.bronze,
  });

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

  const siteText = getRenderableText(bodyFont, "www.suaoab.com.br", 12);
  const siteWidth = bodyFont.widthOfTextAtSize(siteText.content, 12);

  const contentCardX = margin + 40;
  const contentCardY = height * 0.33;
  const contentCardWidth = width - (margin + 40) * 2;
  const contentCardHeight = 210;

  page.drawRectangle({
    x: contentCardX,
    y: contentCardY,
    width: contentCardWidth,
    height: contentCardHeight,
    color: COLORS.white,
    borderColor: COLORS.bronzeSoft,
    borderWidth: 1,
  });

  const imagePanelX = contentCardX + 14;
  const imagePanelY = contentCardY + 14;
  const imagePanelWidth = contentCardWidth * 0.55;
  const imagePanelHeight = contentCardHeight - 28;
  const textPanelX = imagePanelX + imagePanelWidth + 20;
  const textPanelWidth = contentCardX + contentCardWidth - 16 - textPanelX;

  page.drawRectangle({
    x: imagePanelX,
    y: imagePanelY,
    width: imagePanelWidth,
    height: imagePanelHeight,
    color: rgb(0.98, 0.97, 0.95),
  });

  if (promoImage) {
    const promoDims = getImageFit(promoImage, imagePanelWidth - 16, imagePanelHeight - 16);
    page.drawImage(promoImage, {
      x: imagePanelX + (imagePanelWidth - promoDims.width) / 2,
      y: imagePanelY + (imagePanelHeight - promoDims.height) / 2,
      width: promoDims.width,
      height: promoDims.height,
    });
  }

  const imageTagWidth = 186;
  const imageTagHeight = 28;
  const imageTagX = imagePanelX + 14;
  const imageTagY = imagePanelY + imagePanelHeight - imageTagHeight - 14;

  page.drawRectangle({
    x: imageTagX,
    y: imageTagY,
    width: imageTagWidth,
    height: imageTagHeight,
    color: COLORS.navy,
    borderColor: COLORS.navy,
    borderWidth: 1,
  });

  const imageCaption = getRenderableText(eyebrowFont, "Foco 100% no Padrão FGV", 9);
  page.drawText(imageCaption.content, {
    x: imageTagX + 12,
    y: imageTagY + 10,
    size: 9,
    font: eyebrowFont,
    color: COLORS.white,
  });

  const messageTitleSize = 20;
  const messageBodySize = 11;
  const messageQuoteSize = 12;
  const messageTitle = getRenderableText(titleFont, "O maior erro é estudar o que não cai.", messageTitleSize);
  const messageTitleLines = wrapText(titleFont, messageTitle.content, messageTitleSize, textPanelWidth);
  const messageBody = getRenderableText(
    bodyFont,
    "Pare de perder tempo com materiais infinitos. Domine o padrão de cobrança da FGV com um método enxuto, previsível e focado no que realmente garante a sua carteira.",
    messageBodySize
  );
  const messageBodyLines = wrapText(bodyFont, messageBody.content, messageBodySize, textPanelWidth);
  const messageQuote = getRenderableText(bodyFont, '"A sua aprovação é uma questão de matemática e estratégia."', messageQuoteSize);
  const messageQuoteLines = wrapText(bodyFont, messageQuote.content, messageQuoteSize, textPanelWidth);

  let textCursorY = contentCardY + contentCardHeight - 40;
  for (const line of messageTitleLines.slice(0, 3)) {
    const lineWidth = titleFont.widthOfTextAtSize(line, messageTitleSize);
    page.drawText(line, {
      x: textPanelX + (textPanelWidth - lineWidth) / 2,
      y: textCursorY,
      size: messageTitleSize,
      font: titleFont,
      color: COLORS.navy,
    });
    textCursorY -= 24;
  }

  textCursorY -= 10;
  for (const line of messageBodyLines.slice(0, 5)) {
    const lineWidth = bodyFont.widthOfTextAtSize(line, messageBodySize);
    page.drawText(line, {
      x: textPanelX + (textPanelWidth - lineWidth) / 2,
      y: textCursorY,
      size: messageBodySize,
      font: bodyFont,
      color: COLORS.graphite,
    });
    textCursorY -= 15;
  }

  textCursorY -= 10;
  for (const line of messageQuoteLines.slice(0, 3)) {
    const lineWidth = bodyFont.widthOfTextAtSize(line, messageQuoteSize);
    page.drawText(line, {
      x: textPanelX + (textPanelWidth - lineWidth) / 2,
      y: textCursorY,
      size: messageQuoteSize,
      font: bodyFont,
      color: COLORS.bronze,
    });
    textCursorY -= 15;
  }

  const ctaText = getRenderableText(ctaFont, "CLIQUE AQUI E GARANTA SUA VAGA NA MENTORIA", 12);
  const ctaFontSize = 12;
  const ctaWidth = 400;
  const ctaHeight = 45;
  const ctaTextWidth = ctaFont.widthOfTextAtSize(ctaText.content, ctaFontSize);
  const ctaX = width / 2 - 200;
  const siteY = margin + 12;
  const symbolY = margin + 32;
  const symbolMaxWidth = 160;
  const symbolMaxHeight = 70;
  const symbolDims = symbolImage ? getImageFit(symbolImage, symbolMaxWidth, symbolMaxHeight) : null;
  const ctaY = symbolY + (symbolDims?.height || 0) + 30;

  page.drawRectangle({
    x: ctaX,
    y: ctaY,
    width: ctaWidth,
    height: ctaHeight,
    color: rgb(0.77, 0.63, 0.35),
    borderColor: rgb(0.77, 0.63, 0.35),
    borderWidth: 1,
  });

  page.drawText(ctaText.content, {
    x: ctaX + (ctaWidth - ctaTextWidth) / 2,
    y: ctaY + (ctaHeight - ctaFontSize) / 2 + 2,
    size: ctaFontSize,
    font: ctaFont,
    color: COLORS.white,
  });

  addLinkAnnotation(pdfDoc, page, ctaX, ctaY, ctaWidth, ctaHeight, "https://suaoab.com.br");

  if (symbolImage && symbolDims) {
    page.drawImage(symbolImage, {
      x: width / 2 - symbolDims.width / 2,
      y: symbolY,
      width: symbolDims.width,
      height: symbolDims.height,
    });
  }

  page.drawText(siteText.content, {
    x: width / 2 - siteWidth / 2,
    y: siteY,
    size: 12,
    font: bodyFont,
    color: COLORS.navy,
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
  const subtitle = "A rota mais segura e matematica ate a aprovacao do Exame da OAB.";
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
  fileName,
}: DownloadProtectedPDFParams) => {
  const [logoAsset, promoImageAsset, symbolAsset, response] = await Promise.all([
    loadLogoAsset(),
    loadPromoImageAsset(),
    loadSymbolAsset(),
    fetch(getPdfProxyUrl(originalPdfUrl)),
  ]);

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Nao foi possivel baixar o PDF original. ${responseText}`.trim());
  }

  const originalPdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const logoImage = await embedImageAsset(pdfDoc, logoAsset).catch(() => null);
  const promoImage = await embedImageAsset(pdfDoc, promoImageAsset).catch(() => null);
  const symbolImage = await embedImageAsset(pdfDoc, symbolAsset).catch(() => null);

  try {
    await appendMarketingPage(pdfDoc, logoImage, promoImage, symbolImage);
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
