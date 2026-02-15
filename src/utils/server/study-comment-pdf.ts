import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type Color } from "pdf-lib";
import type { StudyCommentPdfInput } from "@/types";

// --- 2. Constantes de Configuración ---
const CONFIG = {
  layout: {
    width: 595.28, // A4
    height: 841.89, // A4
    marginTop: 30,
    marginBottom: 50,
    marginLeft: 35,
    marginRight: 35,
    lineHeight: 14,
  },
  fonts: {
    titleSize: 11,
    headerSize: 9,
    bodySize: 9,
    smallSize: 8,
  },
  colors: {
    primary: rgb(0.28, 0.55, 0.15), // Restaurado verde hospital
    textBlack: rgb(0, 0, 0),
    textGray: rgb(0.3, 0.3, 0.3),
    white: rgb(1, 1, 1),
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

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.page = doc.addPage([CONFIG.layout.width, CONFIG.layout.height]);
    this.cursorY = CONFIG.layout.height - CONFIG.layout.marginTop;
  }

  async initFonts() {
    this.fontRegular = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  // --- Gestión de Espacio ---
  private checkPageBreak(neededHeight: number) {
    if (this.cursorY - neededHeight < CONFIG.layout.marginBottom) {
      this.page = this.doc.addPage([CONFIG.layout.width, CONFIG.layout.height]);
      this.cursorY = CONFIG.layout.height - CONFIG.layout.marginTop;
      return true; // Hubo salto de página
    }
    return false;
  }

  // --- Componentes Gráficos ---

  drawHeader(institutionName?: string) {
    const centerX = CONFIG.layout.width / 2;
    
    const drawCenteredText = (text: string, y: number, font: PDFFont, size: number) => {
      const width = font.widthOfTextAtSize(text, size);
      this.page.drawText(text, {
        x: centerX - (width / 2),
        y: y,
        font: font,
        size: size,
        color: CONFIG.colors.textBlack,
      });
    };

    const hospitalTitle = (institutionName || "EMPRESA SOCIAL DEL ESTADO HOSPITAL LOCAL DE MONTELIBANO").toUpperCase();
    drawCenteredText(hospitalTitle, this.cursorY, this.fontBold, 11);
    this.cursorY -= 14;
    drawCenteredText("NIT 812000344-4", this.cursorY, this.fontRegular, 10);
    this.cursorY -= 13;
    drawCenteredText("CR 5 23 144 BRR LA LUCHA", this.cursorY, this.fontRegular, 10);
    this.cursorY -= 13;
    drawCenteredText("Teléfono: 7626639", this.cursorY, this.fontRegular, 10);
    
    this.cursorY -= 25;
    this.cursorY -= 20;
  }

  drawPatientInfoBox(data: {
    patientName: string;
    patientId: string;
    patientSex: string;
    studyDate: string;
    receptionNo?: string;
    institutionName?: string;
  }) {
    const startX = CONFIG.layout.marginLeft;
    const boxWidth = CONFIG.layout.width - (CONFIG.layout.marginLeft * 2);
    const boxHeight = 60;
    
    // Dibujar el cuadro contenedor
    this.page.drawRectangle({
      x: startX,
      y: this.cursorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: CONFIG.colors.textBlack,
      borderWidth: 1,
    });

    const padding = 8;
    let currentY = this.cursorY - 15;
    const col2X = startX + (boxWidth * 0.55);

    // Fila 1
    this.drawField("Usuario:", data.patientName, startX + padding, currentY);
    this.drawField("No. Recepción:", data.receptionNo || "N/A", col2X, currentY);
    currentY -= 15;

    // Fila 2
    this.drawField("Sexo:", data.patientSex, startX + padding, currentY);
    this.drawField("Fecha:", data.studyDate, col2X, currentY);
    currentY -= 15;

    // Fila 3
    this.drawField("Identificación:", data.patientId, startX + padding, currentY);
    this.drawField("Institución:", data.institutionName || "N/A", col2X, currentY);

    this.cursorY -= (boxHeight + 25);
  }

  // Helper para dibujar campos
  private drawField(label: string, value: string, x: number, y: number) {
    this.page.drawText(label, {
      x: x,
      y: y,
      font: this.fontBold,
      size: 9,
    });
    
    const labelWidth = this.fontBold.widthOfTextAtSize(label, 9);
    
    this.page.drawText(value, {
      x: x + labelWidth + 5,
      y: y,
      font: this.fontRegular,
      size: 9,
    });
  }

  drawSectionTitle(title: string) {
    const barHeight = 18;
    this.checkPageBreak(barHeight + 20);

    // Barra verde de fondo restaurada
    this.page.drawRectangle({
      x: CONFIG.layout.marginLeft,
      y: this.cursorY - barHeight + 4,
      width: CONFIG.layout.width - (CONFIG.layout.marginLeft * 2),
      height: barHeight,
      color: CONFIG.colors.primary,
    });

    // Texto blanco sobre la barra
    this.page.drawText(title, {
      x: CONFIG.layout.marginLeft + 5,
      y: this.cursorY - barHeight + 9,
      font: this.fontBold,
      size: CONFIG.fonts.headerSize,
      color: CONFIG.colors.white,
    });

    this.cursorY -= 30; // Margen después de la barra
  }

  drawCommentBody(comment: string) {
    const maxWidth = CONFIG.layout.width - (CONFIG.layout.marginLeft * 2);
    const lines = wrapText(comment, this.fontRegular, CONFIG.fonts.bodySize, maxWidth);

    for (const line of lines) {
      if (this.checkPageBreak(CONFIG.layout.lineHeight)) {
        // Si hay salto de página, redibujar título de sección o continuar
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
    // Pie de página (branding pequeño)
    this.page.drawText("Generado por Sistema de Gestión de Imágenes", {
      x: CONFIG.layout.marginLeft,
      y: 20,
      font: this.fontRegular,
      size: 6,
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
    studyDate: input.studyDate,
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