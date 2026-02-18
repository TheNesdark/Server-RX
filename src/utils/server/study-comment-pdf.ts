import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import type { StudyCommentPdfInput } from "@/types";

/**
 * CONFIGURACIÓN DE DISEÑO (A4)
 */
const CONFIG = {
  layout: {
    width: 595.28,  // A4 Width
    height: 841.89, // A4 Height
    margin: 50,     // Margen uniforme
    lineHeight: 14,
  },
  fonts: {
    title: 16,
    subtitle: 12,
    body: 10,
    label: 9,
    footer: 8,
  },
  colors: {
    brand: rgb(0.12, 0.58, 0.38), // Verde médico (basado en el logo)
    darkText: rgb(0.1, 0.1, 0.1),
    mutedText: rgb(0.4, 0.4, 0.4),
    bgLight: rgb(0.97, 0.99, 0.98),
    border: rgb(0.8, 0.85, 0.82),
  }
};

/**
 * Divide texto largo en líneas que quepan en un ancho específico
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) {
      lines.push("");
      continue;
    }

    const words = p.split(/\s+/);
    let currentLine = "";

    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      const testLine = currentLine ? currentLine + " " + word : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

class PDFReport {
  private doc: PDFDocument;
  private page: PDFPage;
  private fontBold!: PDFFont;
  private fontRegular!: PDFFont;
  private y: number;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.page = this.doc.addPage([CONFIG.layout.width, CONFIG.layout.height]);
    this.y = CONFIG.layout.height - CONFIG.layout.margin;
  }

  async setupFonts() {
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
  }

  private checkNewPage(needed: number) {
    if (this.y - needed < CONFIG.layout.margin) {
      this.page = this.doc.addPage([CONFIG.layout.width, CONFIG.layout.height]);
      this.y = CONFIG.layout.height - CONFIG.layout.margin;
      this.drawDecorations();
      return true;
    }
    return false;
  }

  private drawDecorations() {
    // Línea de cabecera sutil
    this.page.drawLine({
      start: { x: CONFIG.layout.margin, y: CONFIG.layout.height - 35 },
      end: { x: CONFIG.layout.width - CONFIG.layout.margin, y: CONFIG.layout.height - 35 },
      color: CONFIG.colors.brand,
      thickness: 0.5,
      opacity: 0.3
    });
  }

  async drawHeader(institution?: string) {
    const instName = (institution || "CENTRO RADIOLÓGICO").toUpperCase();
    let logoWidth = 0;

    // Intentar cargar logo (Rutas para Dev y Prod/EXE)
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), "public/assets/logo.png"),
        path.resolve(process.cwd(), "dist/client/assets/logo.png"),
        path.resolve(process.cwd(), "assets/logo.png")
      ];
      
      let logoPath = "";
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }

      if (logoPath) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await this.doc.embedPng(logoBytes);
        
        const logoScale = 40 / logoImage.height;
        const logoDims = {
          width: logoImage.width * logoScale,
          height: 40
        };
        logoWidth = logoDims.width;
        
        this.page.drawImage(logoImage, {
          x: CONFIG.layout.margin,
          y: this.y - 40,
          width: logoDims.width,
          height: logoDims.height,
        });
      }
    } catch (e) {
      console.error("Error cargando logo en PDF:", e);
    }

    const textX = CONFIG.layout.margin + (logoWidth > 0 ? logoWidth + 15 : 0);
    
    // Institución (Alineado verticalmente con el logo)
    this.page.drawText(instName, {
      x: textX,
      y: this.y - 18,
      font: this.fontBold,
      size: CONFIG.fonts.subtitle,
      color: CONFIG.colors.brand
    });

    this.page.drawText("Servicio de Diagnóstico por Imágenes", {
      x: textX,
      y: this.y - 32,
      font: this.fontRegular,
      size: 9,
      color: CONFIG.colors.mutedText
    });

    // Fecha de emisión (Derecha)
    const now = new Date().toLocaleDateString();
    const nowWidth = this.fontRegular.widthOfTextAtSize("Emisión: " + now, 9);
    this.page.drawText("Emisión: " + now, {
      x: CONFIG.layout.width - CONFIG.layout.margin - nowWidth,
      y: this.y - 18,
      font: this.fontRegular,
      size: 9,
      color: CONFIG.colors.mutedText
    });

    this.y -= 70;

    // Título Principal
    const title = "INFORME DE ESTUDIO RADIOLÓGICO";
    const tw = this.fontBold.widthOfTextAtSize(title, CONFIG.fonts.title);
    this.page.drawText(title, {
      x: (CONFIG.layout.width / 2) - (tw / 2),
      y: this.y,
      font: this.fontBold,
      size: CONFIG.fonts.title,
      color: CONFIG.colors.darkText
    });

    this.y -= 30;
  }

  drawPatientTable(data: StudyCommentPdfInput) {
    const startY = this.y;
    const tableWidth = CONFIG.layout.width - (CONFIG.layout.margin * 2);
    const rowHeight = 20;
    const rows = 4;
    const totalHeight = rowHeight * rows;

    // Fondo para la tabla
    this.page.drawRectangle({
      x: CONFIG.layout.margin,
      y: this.y - totalHeight,
      width: tableWidth,
      height: totalHeight,
      color: CONFIG.colors.bgLight,
      borderColor: CONFIG.colors.border,
      borderWidth: 1
    });

    const drawRow = (label1: string, val1: string, label2: string, val2: string, rowIndex: number) => {
      const rowY = startY - (rowHeight * rowIndex) - 14;
      const col1 = CONFIG.layout.margin + 10;
      const col2 = CONFIG.layout.margin + (tableWidth / 2) + 10;

      this.page.drawText(label1, { x: col1, y: rowY, font: this.fontBold, size: CONFIG.fonts.label, color: CONFIG.colors.brand });
      this.page.drawText(val1 || "N/A", { x: col1 + 70, y: rowY, font: this.fontRegular, size: CONFIG.fonts.body });

      this.page.drawText(label2, { x: col2, y: rowY, font: this.fontBold, size: CONFIG.fonts.label, color: CONFIG.colors.brand });
      this.page.drawText(val2 || "N/A", { x: col2 + 70, y: rowY, font: this.fontRegular, size: CONFIG.fonts.body });
    };

    drawRow("PACIENTE:", data.patientName, "ID:", data.patientId, 0);
    drawRow("SEXO:", data.patientSex, "EDAD:", data.patientAge, 1);
    drawRow("ESTUDIO:", data.studyDate, "HORA:", data.studyTime, 2);
    drawRow("REF:", data.receptionNo || "S/N", "INST.:", data.institutionName || "Local", 3);

    this.y -= totalHeight + 40;
  }

  drawFindings(comment: string) {
    this.page.drawText("HALLAZGOS Y CONCLUSIONES:", {
      x: CONFIG.layout.margin,
      y: this.y,
      font: this.fontBold,
      size: CONFIG.fonts.subtitle,
      color: CONFIG.colors.brand
    });

    this.y -= 25;

    const contentWidth = CONFIG.layout.width - (CONFIG.layout.margin * 2);
    const text = comment || "Sin hallazgos reportados en el sistema.";
    const lines = wrapText(text, this.fontRegular, CONFIG.fonts.body, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      this.checkNewPage(CONFIG.layout.lineHeight);
      
      this.page.drawText(lines[i], {
        x: CONFIG.layout.margin,
        y: this.y,
        font: this.fontRegular,
        size: CONFIG.fonts.body,
        color: CONFIG.colors.darkText
      });

      this.y -= CONFIG.layout.lineHeight;
    }
  }

  drawFooter() {
    const footerText = "Este documento es un informe digital generado automáticamente. No reemplaza el criterio médico definitivo.";
    const fw = this.fontRegular.widthOfTextAtSize(footerText, CONFIG.fonts.footer);
    
    this.page.drawText(footerText, {
      x: (CONFIG.layout.width / 2) - (fw / 2),
      y: 30,
      font: this.fontRegular,
      size: CONFIG.fonts.footer,
      color: CONFIG.colors.mutedText
    });
  }
}

export async function createStudyCommentPdf(input: StudyCommentPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const report = new PDFReport(pdfDoc);
  
  await report.setupFonts();
  
  await report.drawHeader(input.institutionName);
  report.drawPatientTable(input);
  report.drawFindings(input.comment);
  report.drawFooter();

  return await pdfDoc.save();
}