import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Shared utility functions for exporting reports as PDF or images
 * Optimized for single-capture approach with proper pagination
 */

export interface ExportOptions {
  filename: string;
  title?: string;
  includeTimestamp?: boolean;
  pageOrientation?: "portrait" | "landscape";
}

export interface ExportResult {
  success: boolean;
  error?: string;
  blob?: Blob;
  url?: string;
}

/**
 * Compress image data by reducing quality
 */
function compressImage(canvas: HTMLCanvasElement, quality: number = 0.7): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Export a report as PDF with smart pagination
 * - Captures content ONCE
 * - Chart section on page 1 (scaled to fit)
 * - Table section on page 2+ (with proper pagination)
 */
export async function exportChartAsPDF(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null, // Keep signature for compatibility
  options: ExportOptions
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const { filename, title, includeTimestamp = true, pageOrientation = "portrait" } = options;
    
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yOffset = margin;

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, pageWidth / 2, yOffset, { align: "center" });
      yOffset += 8;
    }

    // Add timestamp if requested
    if (includeTimestamp) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120);
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated: ${timestamp}`, pageWidth / 2, yOffset, { align: "center" });
      pdf.setTextColor(0);
      yOffset += 10;
    }

    // Capture entire report ONCE with lower scale for smaller file size
    const reportCanvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    // Compress report image
    const reportImgData = compressImage(reportCanvas, 0.8);
    
    // Calculate dimensions to fit content properly
    const reportAspectRatio = reportCanvas.width / reportCanvas.height;
    const reportWidth = contentWidth;
    const reportHeight = reportWidth / reportAspectRatio;

    // Calculate how much fits on page 1 (for chart section)
    const maxPage1Height = pageHeight - yOffset - margin;
    
    // Try to fit ~40% of content on page 1 (chart section)
    const chartSectionHeight = Math.min(reportHeight * 0.4, maxPage1Height);
    
    // Center chart horizontally
    const chartX = margin;
    
    // Add chart section to page 1
    const pxPerMm = reportCanvas.width / reportWidth;
    const chartHeightPx = chartSectionHeight * pxPerMm;
    
    // Create canvas for chart section
    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = reportCanvas.width;
    chartCanvas.height = Math.ceil(chartHeightPx);
    const chartCtx = chartCanvas.getContext("2d");
    
    if (chartCtx) {
      chartCtx.fillStyle = "#ffffff";
      chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
      chartCtx.drawImage(
        reportCanvas,
        0, 0,
        reportCanvas.width, chartHeightPx,
        0, 0,
        reportCanvas.width, chartHeightPx
      );
      
      const chartData = compressImage(chartCanvas, 0.8);
      pdf.addImage(chartData, "JPEG", chartX, yOffset, reportWidth, chartSectionHeight, undefined, "FAST");
    }

    // Add table section starting on NEW page 2
    pdf.addPage();
    yOffset = margin;

    // Add "Data Table" subtitle
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Data Table", margin, yOffset);
    yOffset += 8;

    // Calculate remaining content (table section)
    const remainingHeight = reportHeight - chartSectionHeight;
    const sourceY = chartSectionHeight;
    
    // Add table section with pagination
    const availableHeight = pageHeight - yOffset - margin;
    let tableRemainingHeight = remainingHeight;
    let tableSourceY = sourceY;

    while (tableRemainingHeight > 0) {
      const sliceHeight = Math.min(tableRemainingHeight, availableHeight);
      const sliceHeightPx = sliceHeight * pxPerMm;
      const sourceYPx = tableSourceY * pxPerMm;

      // Create temp canvas for slice
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = reportCanvas.width;
      tempCanvas.height = Math.ceil(sliceHeightPx);
      const ctx = tempCanvas.getContext("2d");
      
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(
          reportCanvas,
          0, sourceYPx,
          reportCanvas.width, sliceHeightPx,
          0, 0,
          reportCanvas.width, sliceHeightPx
        );
        
        const sliceData = compressImage(tempCanvas, 0.75);
        pdf.addImage(sliceData, "JPEG", margin, yOffset, reportWidth, sliceHeight, undefined, "FAST");
      }

      tableRemainingHeight -= sliceHeight;
      tableSourceY += sliceHeight;

      if (tableRemainingHeight > 0) {
        pdf.addPage();
        yOffset = margin;
      }
    }

    // Download the file (no auto-open to avoid dialog confusion)
    pdf.save(`${filename}.pdf`);

    return { success: true };
  } catch (error) {
    console.error("PDF export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Export a report as JPG image (compressed)
 */
export async function exportChartAsImage(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null, // Keep signature for compatibility
  options: ExportOptions
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const { filename } = options;

    // Capture entire report ONCE with lower scale for smaller file
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    // Convert to JPG blob with compression
    const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    
    // Download image (no auto-open to avoid blank page issue)
    const link = document.createElement("a");
    link.href = jpgDataUrl;
    link.download = `${filename}.jpg`;
    link.click();

    return { success: true, url: jpgDataUrl };
  } catch (error) {
    console.error("Image export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Print report using optimized PDF
 */
export async function printReport(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null, // Keep signature for compatibility
  title: string
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yOffset = margin;

    // Add title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, pageWidth / 2, yOffset, { align: "center" });
    yOffset += 8;

    // Add timestamp
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(120);
    pdf.text(`Printed: ${new Date().toLocaleString()}`, pageWidth / 2, yOffset, { align: "center" });
    pdf.setTextColor(0);
    yOffset += 10;

    // Capture report ONCE
    const reportCanvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    const reportImgData = compressImage(reportCanvas, 0.8);
    const reportWidth = contentWidth;
    const reportHeight = reportWidth / (reportCanvas.width / reportCanvas.height);
    const maxPage1Height = pageHeight - yOffset - margin;
    const chartSectionHeight = Math.min(reportHeight * 0.4, maxPage1Height);
    const pxPerMm = reportCanvas.width / reportWidth;
    const chartHeightPx = chartSectionHeight * pxPerMm;
    
    // Chart section
    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = reportCanvas.width;
    chartCanvas.height = Math.ceil(chartHeightPx);
    const chartCtx = chartCanvas.getContext("2d");
    
    if (chartCtx) {
      chartCtx.fillStyle = "#ffffff";
      chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
      chartCtx.drawImage(
        reportCanvas,
        0, 0,
        reportCanvas.width, chartHeightPx,
        0, 0,
        reportCanvas.width, chartHeightPx
      );
      
      const chartData = compressImage(chartCanvas, 0.8);
      pdf.addImage(chartData, "JPEG", margin, yOffset, reportWidth, chartSectionHeight, undefined, "FAST");
    }

    // Table section on new page
    pdf.addPage();
    yOffset = margin;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Data Table", margin, yOffset);
    yOffset += 8;

    const remainingHeight = reportHeight - chartSectionHeight;
    const sourceY = chartSectionHeight;
    const availableHeight = pageHeight - yOffset - margin;
    let tableRemainingHeight = remainingHeight;
    let tableSourceY = sourceY;

    while (tableRemainingHeight > 0) {
      const sliceHeight = Math.min(tableRemainingHeight, availableHeight);
      const sliceHeightPx = sliceHeight * pxPerMm;
      const sourceYPx = tableSourceY * pxPerMm;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = reportCanvas.width;
      tempCanvas.height = Math.ceil(sliceHeightPx);
      const ctx = tempCanvas.getContext("2d");
      
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(
          reportCanvas,
          0, sourceYPx,
          reportCanvas.width, sliceHeightPx,
          0, 0,
          reportCanvas.width, sliceHeightPx
        );
        
        const sliceData = compressImage(tempCanvas, 0.75);
        pdf.addImage(sliceData, "JPEG", margin, yOffset, reportWidth, sliceHeight, undefined, "FAST");
      }

      tableRemainingHeight -= sliceHeight;
      tableSourceY += sliceHeight;

      if (tableRemainingHeight > 0) {
        pdf.addPage();
        yOffset = margin;
      }
    }

    // Open print dialog
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    return { success: true, url: pdfUrl };
  } catch (error) {
    console.error("Print failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Print failed",
    };
  }
}

/**
 * Generate a filename with timestamp
 */
export function generateExportFilename(prefix: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return `${prefix}_${dateStr}`;
}