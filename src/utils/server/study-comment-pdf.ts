import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import type { StudyCommentPdfInput } from "@/types";

/**
 * CONFIGURACIÓN DE DISEÑO PROFESIONAL (A4)
 */
const DESIGN = {
  size: { width: 595.28, height: 841.89 },
  margin: { top: 40, bottom: 60, left: 50, right: 50 },
  colors: {
    primary: rgb(0.05, 0.45, 0.35),   // Verde médico profundo
    secondary: rgb(0.4, 0.4, 0.4),   // Gris para texto secundario
    text: rgb(0.15, 0.15, 0.15),      // Gris casi negro para texto principal
    background: rgb(0.98, 0.99, 0.98), // Fondo muy suave
    border: rgb(0.85, 0.88, 0.86),    // Bordes sutiles
  },
  lineHeight: 14,
};

class MedicalPDF {
  private doc: PDFDocument;
  private page!: PDFPage;
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private cursorY: number;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.cursorY = 0;
  }

  async init() {
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.addNewPage();
  }

  private addNewPage() {
    this.page = this.doc.addPage([DESIGN.size.width, DESIGN.size.height]);
    this.cursorY = DESIGN.size.height - DESIGN.margin.top;
    this.drawPageDecorations();
  }

  private drawPageDecorations() {
    // Línea lateral decorativa
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: 5,
      height: DESIGN.size.height,
      color: DESIGN.colors.primary,
    });
  }

  private checkSpace(needed: number) {
    if (this.cursorY - needed < DESIGN.margin.bottom) {
      this.addNewPage();
    }
  }

  async drawHeader(institution?: string) {
    // --- Logo ---
    let logoOffset = 0;
    try {
      const logoPaths = [
        path.join(process.cwd(), "public/assets/logo.png"),
        path.join(process.cwd(), "dist/client/assets/logo.png"),
        path.join(process.cwd(), "assets/logo.png")
      ];
      const logoPath = logoPaths.find(p => fs.existsSync(p));

      if (logoPath) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImg = await this.doc.embedPng(logoBytes);
        const scale = 45 / logoImg.height;
        this.page.drawImage(logoImg, {
          x: DESIGN.margin.left,
          y: this.cursorY - 45,
          width: logoImg.width * scale,
          height: 45,
        });
        logoOffset = (logoImg.width * scale) + 15;
      }
    } catch (e) { console.warn("Logo no disponible"); }

    // --- Texto Institución ---
    const textX = DESIGN.margin.left + logoOffset;
    this.page.drawText((institution || "CENTRO RADIOLÓGICO").toUpperCase(), {
      x: textX,
      y: this.cursorY - 15,
      font: this.fontBold,
      size: 14,
      color: DESIGN.colors.primary,
    });
    this.page.drawText("Servicio de Diagnóstico por Imágenes", {
      x: textX,
      y: this.cursorY - 30,
      font: this.fontRegular,
      size: 9,
      color: DESIGN.colors.secondary,
    });

    // --- Fecha (Derecha) ---
    const dateStr = `Emisión: ${new Date().toLocaleDateString("es-AR")}`;
    this.page.drawText(dateStr, {
      x: DESIGN.size.width - DESIGN.margin.right - this.fontRegular.widthOfTextAtSize(dateStr, 9),
      y: this.cursorY - 15,
      font: this.fontRegular,
      size: 9,
      color: DESIGN.colors.secondary,
    });

    this.cursorY -= 75;
    
    // --- Título del Documento ---
    const title = "INFORME DE RESULTADOS";
    const titleWidth = this.fontBold.widthOfTextAtSize(title, 18);
    this.page.drawText(title, {
      x: (DESIGN.size.width / 2) - (titleWidth / 2),
      y: this.cursorY,
      font: this.fontBold,
      size: 18,
      color: DESIGN.colors.text,
    });
    
    this.cursorY -= 35;
  }

  drawPatientBox(data: StudyCommentPdfInput) {
    const boxWidth = DESIGN.size.width - DESIGN.margin.left - DESIGN.margin.right;
    const boxHeight = 85;
    
    // Fondo de la caja
    this.page.drawRectangle({
      x: DESIGN.margin.left,
      y: this.cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: DESIGN.colors.background,
      borderColor: DESIGN.colors.border,
      borderWidth: 1,
    });

    const drawField = (label: string, value: string, x: number, y: number) => {
      this.page.drawText(label, { x, y, font: this.fontBold, size: 9, color: DESIGN.colors.primary });
      const labelWidth = this.fontBold.widthOfTextAtSize(label, 9);
      this.page.drawText(value || "N/A", { x: x + labelWidth + 5, y, font: this.fontRegular, size: 10, color: DESIGN.colors.text });
    };

    const row1 = this.cursorY - 20;
    const row2 = this.cursorY - 40;
    const row3 = this.cursorY - 60;
    const row4 = this.cursorY - 80;
    const col2 = DESIGN.margin.left + (boxWidth / 2);

    drawField("PACIENTE:", data.patientName, DESIGN.margin.left + 15, row1);
    drawField("ID:", data.patientId, col2, row1);
    
    drawField("SEXO:", data.patientSex, DESIGN.margin.left + 15, row2);
    drawField("EDAD:", data.patientAge, col2, row2);
    
    drawField("FECHA ESTUDIO:", data.studyDate, DESIGN.margin.left + 15, row3);
    drawField("HORA:", data.studyTime, col2, row3);
    
    drawField("REFERENCIA:", data.receptionNo || "S/N", DESIGN.margin.left + 15, row4);
    drawField("INSTITUCIÓN:", data.institutionName || "Local", col2, row4);

    this.cursorY -= boxHeight + 40;
  }

  drawFindings(text?: string) {
    const title = "HALLAZGOS Y CONCLUSIONES";
    this.page.drawText(title, {
      x: DESIGN.margin.left,
      y: this.cursorY,
      font: this.fontBold,
      size: 12,
      color: DESIGN.colors.primary,
    });
    
    this.page.drawLine({
      start: { x: DESIGN.margin.left, y: this.cursorY - 5 },
      end: { x: DESIGN.margin.left + 160, y: this.cursorY - 5 },
      color: DESIGN.colors.primary,
      thickness: 1.5,
    });

    this.cursorY -= 30;

    const content = text || "No se registran hallazgos adicionales para este estudio.";
    const maxWidth = DESIGN.size.width - DESIGN.margin.left - DESIGN.margin.right;
    
    const paragraphs = content.split(/\r?\n/);
    for (const p of paragraphs) {
      if (!p.trim()) {
        this.cursorY -= 10;
        continue;
      }

      const words = p.split(/\s+/);
      let line = "";

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const width = this.fontRegular.widthOfTextAtSize(testLine, 11);

        if (width > maxWidth) {
          this.checkSpace(DESIGN.lineHeight);
          this.page.drawText(line, { x: DESIGN.margin.left, y: this.cursorY, font: this.fontRegular, size: 11 });
          this.cursorY -= DESIGN.lineHeight + 2;
          line = word;
        } else {
          line = testLine;
        }
      }
      
      if (line) {
        this.checkSpace(DESIGN.lineHeight);
        this.page.drawText(line, { x: DESIGN.margin.left, y: this.cursorY, font: this.fontRegular, size: 11 });
        this.cursorY -= DESIGN.lineHeight + 5;
      }
    }
  }

  drawFooter() {
    const footerText = "Este documento es un informe médico digital. La interpretación final corresponde al médico tratante.";
    const width = this.fontRegular.widthOfTextAtSize(footerText, 8);
    
    this.page.drawText(footerText, {
      x: (DESIGN.size.width / 2) - (width / 2),
      y: 30,
      font: this.fontRegular,
      size: 8,
      color: DESIGN.colors.secondary,
    });
  }
}

export async function createStudyCommentPdf(input: StudyCommentPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const report = new MedicalPDF(doc);
  
  await report.init();
  await report.drawHeader(input.institutionName);
  report.drawPatientBox(input);
  report.drawFindings(input.comment);
  report.drawFooter();

  return await doc.save();
}