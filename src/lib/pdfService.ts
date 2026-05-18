import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

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

const appendMarketingPage = async (pdfDoc: PDFDocument) => {
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const secondaryFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const title = "Mentoria OAB 2a Fase - Professor Miguel";
  const subtitle = "Acesse: suaoab.com.br";

  const titleSize = 24;
  const subtitleSize = 16;
  const titleWidth = font.widthOfTextAtSize(title, titleSize);
  const subtitleWidth = secondaryFont.widthOfTextAtSize(subtitle, subtitleSize);

  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height / 2 + 16,
    size: titleSize,
    font,
    color: rgb(0.62, 0.18, 0.12),
  });

  page.drawText(subtitle, {
    x: (width - subtitleWidth) / 2,
    y: height / 2 - 18,
    size: subtitleSize,
    font: secondaryFont,
    color: rgb(0.14, 0.14, 0.14),
  });
};

export const downloadProtectedPDF = async ({
  originalPdfUrl,
  alunoNome,
  alunoCpfOuEmail,
  fileName,
}: DownloadProtectedPDFParams) => {
  const response = await fetch(originalPdfUrl);

  if (!response.ok) {
    throw new Error("Nao foi possivel baixar o PDF original.");
  }

  const originalPdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

  await appendMarketingPage(pdfDoc);

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
