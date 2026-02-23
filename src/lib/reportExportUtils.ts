import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Shared utility functions for exporting reports as PDF or images
 * Uses single-capture approach with smart pagination
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
function compressImage(canvas: HTMLCanvasElement, quality: number = 0.8): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Export a report as PDF with smart pagination
 * Captures content ONCE from reportRef, then paginates:
 * - Page 1: Chart section (title + stats + chart visualization)
 * - Page 2+: Table section (table header + data rows)
 */
export async function exportChartAsPDF(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null, // Keep for API compatibility
  options: ExportOptions
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const { filename, pageOrientation = "portrait" } = options;
    
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

    // Capture entire report ONCE with optimized settings
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      imageTimeout: 0,
    });

    // Calculate dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerMm = canvas.width / imgWidth;

    // Find split point: Look for where table starts
    // The chart section is typically title + stats cards + chart + legend + period selector
    // Table starts after that - approximately 55-60% of total height for most reports
    const chartSectionRatio = 0.58; // Chart section is ~58% of content
    const chartHeightMm = Math.min(imgHeight * chartSectionRatio, usableHeight);
    const chartHeightPx = chartHeightMm * pxPerMm;

    // PAGE 1: Chart section
    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = canvas.width;
    chartCanvas.height = Math.ceil(chartHeightPx);
    const chartCtx = chartCanvas.getContext("2d");
    
    if (chartCtx) {
      chartCtx.fillStyle = "#ffffff";
      chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
      chartCtx.drawImage(
        canvas,
        0, 0, canvas.width, chartHeightPx,
        0, 0, canvas.width, chartHeightPx
      );
      
      const chartData = compressImage(chartCanvas, 0.85);
      pdf.addImage(chartData, "JPEG", margin, margin, imgWidth, chartHeightMm, undefined, "FAST");
    }

    // PAGE 2+: Table section (remaining content)
    const tableStartPx = chartHeightPx;
    const tableHeightPx = canvas.height - tableStartPx;
    
    if (tableHeightPx > 0) {
      const tableHeightMm = tableHeightPx / pxPerMm;
      let remainingHeightMm = tableHeightMm;
      let sourceYPx = tableStartPx;
      
      while (remainingHeightMm > 0) {
        pdf.addPage();
        
        const sliceHeightMm = Math.min(remainingHeightMm, usableHeight);
        const sliceHeightPx = sliceHeightMm * pxPerMm;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(sliceHeightPx);
        const sliceCtx = sliceCanvas.getContext("2d");
        
        if (sliceCtx) {
          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0, sourceYPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );
          
          const sliceData = compressImage(sliceCanvas, 0.8);
          pdf.addImage(sliceData, "JPEG", margin, margin, imgWidth, sliceHeightMm, undefined, "FAST");
        }

        remainingHeightMm -= sliceHeightMm;
        sourceYPx += sliceHeightPx;
      }
    }

    // Save the file
    pdf.save(`${filename}.pdf`);

    // Auto-open the PDF after a short delay
    setTimeout(() => {
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    }, 500);

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
 * Export a report as JPG image (single capture)
 */
export async function exportChartAsImage(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null,
  options: ExportOptions
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const { filename } = options;

    // Capture entire report ONCE
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      imageTimeout: 0,
    });

    // Convert to JPG blob
    const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    
    // Download image
    const link = document.createElement("a");
    link.href = jpgDataUrl;
    link.download = `${filename}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Auto-open the image after download
    setTimeout(() => {
      window.open(jpgDataUrl, "_blank");
    }, 500);

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
 * Print report using browser print dialog
 */
export async function printReport(
  reportRef: HTMLElement | null,
  _unusedTableRef: HTMLElement | null,
  _title: string
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
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

    // Capture report
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      imageTimeout: 0,
    });

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerMm = canvas.width / imgWidth;

    // Chart section on page 1
    const chartSectionRatio = 0.58;
    const chartHeightMm = Math.min(imgHeight * chartSectionRatio, usableHeight);
    const chartHeightPx = chartHeightMm * pxPerMm;

    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = canvas.width;
    chartCanvas.height = Math.ceil(chartHeightPx);
    const chartCtx = chartCanvas.getContext("2d");
    
    if (chartCtx) {
      chartCtx.fillStyle = "#ffffff";
      chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
      chartCtx.drawImage(
        canvas,
        0, 0, canvas.width, chartHeightPx,
        0, 0, canvas.width, chartHeightPx
      );
      
      const chartData = compressImage(chartCanvas, 0.85);
      pdf.addImage(chartData, "JPEG", margin, margin, imgWidth, chartHeightMm, undefined, "FAST");
    }

    // Table section on page 2+
    const tableStartPx = chartHeightPx;
    const tableHeightPx = canvas.height - tableStartPx;
    
    if (tableHeightPx > 0) {
      const tableHeightMm = tableHeightPx / pxPerMm;
      let remainingHeightMm = tableHeightMm;
      let sourceYPx = tableStartPx;
      
      while (remainingHeightMm > 0) {
        pdf.addPage();
        
        const sliceHeightMm = Math.min(remainingHeightMm, usableHeight);
        const sliceHeightPx = sliceHeightMm * pxPerMm;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(sliceHeightPx);
        const sliceCtx = sliceCanvas.getContext("2d");
        
        if (sliceCtx) {
          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0, sourceYPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );
          
          const sliceData = compressImage(sliceCanvas, 0.8);
          pdf.addImage(sliceData, "JPEG", margin, margin, imgWidth, sliceHeightMm, undefined, "FAST");
        }

        remainingHeightMm -= sliceHeightMm;
        sourceYPx += sliceHeightPx;
      }
    }

    // Open print dialog
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
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