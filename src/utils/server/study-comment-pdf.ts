import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type Color } from "pdf-lib";
import type { StudyCommentPdfInput } from "@/types";

// --- 2. Constantes de Configuración ---
const CONFIG = {
  layout: {
    width: 419.53, // A5
    height: 595.28, // A5
    marginTop: 35,
    marginBottom: 40,
    marginLeft: 30,
    marginRight: 30,
    lineHeight: 13,
  },
  fonts: {
    titleSize: 12,
    headerSize: 9,
    bodySize: 9,
    smallSize: 7,
    labelSize: 8,
  },
  colors: {
    primary: rgb(0.06, 0.46, 0.43), // #0f766e Esmeralda Hospital
    primaryLight: rgb(0.92, 0.96, 0.95),
    textBlack: rgb(0.05, 0.05, 0.05),
    textGray: rgb(0.4, 0.4, 0.4),
    white: rgb(1, 1, 1),
    border: rgb(0.85, 0.88, 0.90),
    lightBg: rgb(0.98, 0.99, 1.0),
  }
};

// --- 3. Utilidades de Texto ---

/** Divide texto largo en líneas que quepan en un ancho específico */
const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
        // Caso borde: palabra más larga que una línea entera
        while (font.widthOfTextAtSize(currentLine, fontSize) > maxWidth) {
           // Aquí se podría implementar lógica de corte de palabra, 
           // pero por simplicidad forzamos el salto o se corta visualmente.
           // Para este ejemplo, lo dejaremos bajar a la sig línea.
           break; 
        }
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [""];
};

// --- 4. Generador del PDF (Clase Helper) ---

class ReportGenerator {
  private doc: PDFDocument;
  private page: PDFPage;
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private cursorY: number;
  private pageCount: number = 0;

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.page = this.addNewPage();
    this.cursorY = CONFIG.layout.height - CONFIG.layout.marginTop;
  }

  private addNewPage(): PDFPage {
    this.pageCount++;
    const page = this.doc.addPage([CONFIG.layout.width, CONFIG.layout.height]);
    this.drawPageDecorations(page);
    return page;
  }

  private drawPageDecorations(page: PDFPage) {
    // Borde sutil exterior
    page.drawRectangle({
      x: 15,
      y: 15,
      width: CONFIG.layout.width - 30,
      height: CONFIG.layout.height - 30,
      borderColor: CONFIG.colors.primary,
      borderWidth: 0.5,
      opacity: 0.2,
    });

    // Acento en las esquinas
    const s = 20;
    const t = 1.5;
    // Top Left
    page.drawLine({ start: { x: 15, y: CONFIG.layout.height - 15 }, end: { x: 15 + s, y: CONFIG.layout.height - 15 }, color: CONFIG.colors.primary, thickness: t });
    page.drawLine({ start: { x: 15, y: CONFIG.layout.height - 15 }, end: { x: 15, y: CONFIG.layout.height - 15 - s }, color: CONFIG.colors.primary, thickness: t });
    // Bottom Right
    page.drawLine({ start: { x: CONFIG.layout.width - 15, y: 15 }, end: { x: CONFIG.layout.width - 15 - s, y: 15 }, color: CONFIG.colors.primary, thickness: t });
    page.drawLine({ start: { x: CONFIG.layout.width - 15, y: 15 }, end: { x: CONFIG.layout.width - 15, y: 15 + s }, color: CONFIG.colors.primary, thickness: t });
  }

  async initFonts() {
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  // --- Gestión de Espacio ---
  private checkPageBreak(neededHeight: number) {
    if (this.cursorY - neededHeight < CONFIG.layout.marginBottom) {
      this.page = this.addNewPage();
      this.cursorY = CONFIG.layout.height - CONFIG.layout.marginTop;
      return true;
    }
    return false;
  }

  // --- Componentes Gráficos ---

  drawHeader(institutionName?: string) {
    const centerX = CONFIG.layout.width / 2;
    
    // Título de la Institución con estilo
    const hospitalTitle = (institutionName || "HOSPITAL LOCAL DE MONTELIBANO").toUpperCase();
    const titleWidth = this.fontBold.widthOfTextAtSize(hospitalTitle, CONFIG.fonts.titleSize);
    
    this.page.drawText(hospitalTitle, {
      x: centerX - (titleWidth / 2),
      y: this.cursorY,
      font: this.fontBold,
      size: CONFIG.fonts.titleSize,
      color: CONFIG.colors.primary,
    });

    this.cursorY -= 15;

    const subHeaderStyle = { font: this.fontRegular, size: 8, color: CONFIG.colors.textGray };
    
    const drawCenteredSub = (text: string, y: number) => {
      const w = this.fontRegular.widthOfTextAtSize(text, 8);
      this.page.drawText(text, { x: centerX - (w / 2), y, ...subHeaderStyle });
    };

    drawCenteredSub("NIT 812000344-4  |  CR 5 23 144 BRR LA LUCHA", this.cursorY);
    this.cursorY -= 10;
    drawCenteredSub("Teléfono: 7626639  |  Email: contacto@hospitalmontelibano.gov.co", this.cursorY);
    
    this.cursorY -= 20;

    // Línea divisoria elegante
    this.page.drawLine({
      start: { x: CONFIG.layout.marginLeft, y: this.cursorY },
      end: { x: CONFIG.layout.width - CONFIG.layout.marginRight, y: this.cursorY },
      color: CONFIG.colors.border,
      thickness: 1,
    });

    this.cursorY -= 25;
  }

  drawPatientInfoBox(data: {
    patientName: string;
    patientId: string;
    patientSex: string;
    patientAge: string;
    studyDate: string;
    studyTime: string;
    receptionNo?: string;
    institutionName?: string;
  }) {
    const startX = CONFIG.layout.marginLeft;
    const boxWidth = CONFIG.layout.width - (CONFIG.layout.marginLeft + CONFIG.layout.marginRight);
    const boxHeight = 75;
    
    // Contenedor con sombra simulada (borde inferior más grueso)
    this.page.drawRectangle({
      x: startX,
      y: this.cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: CONFIG.colors.lightBg,
      borderColor: CONFIG.colors.border,
      borderWidth: 1,
    });

    // Cabecera del cuadro
    const headerHeight = 16;
    this.page.drawRectangle({
      x: startX,
      y: this.cursorY - headerHeight,
      width: boxWidth,
      height: headerHeight,
      color: CONFIG.colors.primaryLight,
    });

    this.page.drawText("INFORMACIÓN DEL PACIENTE Y ESTUDIO", {
      x: startX + 10,
      y: this.cursorY - 11,
      font: this.fontBold,
      size: 7,
      color: CONFIG.colors.primary,
    });

    const col1 = startX + 10;
    const col2 = startX + (boxWidth * 0.5) + 5;
    let y = this.cursorY - 32;

    const drawField = (label: string, value: string, x: number, currentY: number) => {
      this.page.drawText(label, { x, y: currentY, font: this.fontBold, size: 7, color: CONFIG.colors.textGray });
      this.page.drawText(value, { x: x + 55, y: currentY, font: this.fontRegular, size: 8, color: CONFIG.colors.textBlack });
    };

    drawField("PACIENTE:", data.patientName, col1, y);
    drawField("FECHA:", data.studyDate, col2, y);
    y -= 14;
    drawField("IDENTIDAD:", data.patientId, col1, y);
    drawField("HORA:", data.studyTime, col2, y);
    y -= 14;
    drawField("SEXO/EDAD:", `${data.patientSex} / ${data.patientAge}`, col1, y);
    drawField("ACCESO NO:", data.receptionNo || "N/A", col2, y);

    this.cursorY -= (boxHeight + 25);
  }

  drawSectionTitle(title: string) {
    this.checkPageBreak(30);

    const barWidth = 3;
    // Acento lateral en lugar de barra completa
    this.page.drawRectangle({
      x: CONFIG.layout.marginLeft,
      y: this.cursorY - 12,
      width: barWidth,
      height: 14,
      color: CONFIG.colors.primary,
    });

    this.page.drawText(title, {
      x: CONFIG.layout.marginLeft + 8,
      y: this.cursorY - 10,
      font: this.fontBold,
      size: 9,
      color: CONFIG.colors.primary,
    });

    this.cursorY -= 25;
  }

  drawCommentBody(comment: string) {
    const maxWidth = CONFIG.layout.width - (CONFIG.layout.marginLeft + CONFIG.layout.marginRight);
    const lines = wrapText(comment, this.fontRegular, CONFIG.fonts.bodySize, maxWidth);

    for (const line of lines) {
      if (this.checkPageBreak(CONFIG.layout.lineHeight)) {
        // Continue on next page
      }
      
      this.page.drawText(line, {
        x: CONFIG.layout.marginLeft,
        y: this.cursorY,
        font: this.fontRegular,
        size: CONFIG.fonts.bodySize,
        color: CONFIG.colors.textBlack,
      });
      
      this.cursorY -= CONFIG.layout.lineHeight;
    }
  }

  drawFooter() {
    const text = "Documento generado digitalmente por el Sistema de Gestión de Imágenes RX";
    const fontSize = 6;
    const w = this.fontRegular.widthOfTextAtSize(text, fontSize);
    
    this.page.drawText(text, {
      x: (CONFIG.layout.width / 2) - (w / 2),
      y: 25,
      font: this.fontRegular,
      size: fontSize,
      color: CONFIG.colors.textGray
    });

    // Número de página
    const pageNum = `Página ${this.pageCount}`;
    const pw = this.fontRegular.widthOfTextAtSize(pageNum, fontSize);
    this.page.drawText(pageNum, {
      x: CONFIG.layout.width - CONFIG.layout.marginRight - pw,
      y: 25,
      font: this.fontRegular,
      size: fontSize,
      color: CONFIG.colors.textGray
    });
  }
}

// --- 5. Función Principal Exportada ---

export const createStudyCommentPdf = async (input: StudyCommentPdfInput): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  const generator = new ReportGenerator(pdfDoc);
  await generator.initFonts();

  const safeComment = input.comment?.trim() ? input.comment : "Sin hallazgos reportados.";

  // 1. Encabezado Institucional
  generator.drawHeader(input.institutionName);

  // 2. Información del Paciente (Estilo Imagen)
  generator.drawPatientInfoBox({
    patientName: input.patientName,
    patientId: input.patientId,
    patientSex: input.patientSex,
    patientAge: input.patientAge,
    studyDate: input.studyDate,
    studyTime: input.studyTime,
    receptionNo: input.receptionNo,
    institutionName: input.institutionName,
  });

  // 3. Título de la Sección
  generator.drawSectionTitle("HALLAZGOS Y COMENTARIOS");

  // 4. Cuerpo del Comentario
  generator.drawCommentBody(safeComment);

  // 5. Footer
  generator.drawFooter();

  return pdfDoc.save();
};