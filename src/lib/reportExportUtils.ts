import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Shared utility for exporting reports as PDF or images
 * Clean approach: Capture ONCE, paginate cleanly, NO extra headers
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
 * Export report as PDF with clean pagination
 * - Captures content ONCE
 * - Paginates cleanly across pages
 * - NO extra headers (content already has them)
 * - Auto-opens after download
 */
export async function exportChartAsPDF(
  reportRef: HTMLElement | null,
  _unusedRef: HTMLElement | null,
  options: ExportOptions
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    const { filename, pageOrientation = "portrait" } = options;

    // Capture entire report content ONCE
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

    // Calculate scaled dimensions
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerMm = canvas.width / imgWidth;

    // If content fits on one page, just add it
    if (imgHeight <= usableHeight) {
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
    } else {
      // Content needs pagination - slice cleanly across pages
      let remainingHeightPx = canvas.height;
      let sourceYPx = 0;
      let isFirstPage = true;

      while (remainingHeightPx > 0) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        // Calculate how much content fits on this page
        const sliceHeightMm = Math.min(remainingHeightPx / pxPerMm, usableHeight);
        const sliceHeightPx = Math.ceil(sliceHeightMm * pxPerMm);

        // Create canvas slice for this page
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const sliceCtx = sliceCanvas.getContext("2d");

        if (sliceCtx) {
          // White background
          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          
          // Draw the slice from main canvas
          sliceCtx.drawImage(
            canvas,
            0, sourceYPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );

          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.85);
          pdf.addImage(sliceData, "JPEG", margin, margin, imgWidth, sliceHeightMm);
        }

        remainingHeightPx -= sliceHeightPx;
        sourceYPx += sliceHeightPx;
        isFirstPage = false;
      }
    }

    // Save PDF
    pdf.save(`${filename}.pdf`);

    // Auto-open PDF in new tab after short delay
    setTimeout(() => {
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    }, 300);

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
 * Export report as JPG image with auto-open
 */
export async function exportChartAsImage(
  reportRef: HTMLElement | null,
  _unusedRef: HTMLElement | null,
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
      allowTaint: true,
    });

    // Convert to JPG data URL
    const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Download image
    const link = document.createElement("a");
    link.href = jpgDataUrl;
    link.download = `${filename}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Auto-open image in new tab after short delay
    setTimeout(() => {
      window.open(jpgDataUrl, "_blank");
    }, 300);

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
  _unusedRef: HTMLElement | null,
  _title: string
): Promise<ExportResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  try {
    // Capture entire report ONCE
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerMm = canvas.width / imgWidth;

    // If content fits on one page, just add it
    if (imgHeight <= usableHeight) {
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
    } else {
      // Content needs pagination
      let remainingHeightPx = canvas.height;
      let sourceYPx = 0;
      let isFirstPage = true;

      while (remainingHeightPx > 0) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        const sliceHeightMm = Math.min(remainingHeightPx / pxPerMm, usableHeight);
        const sliceHeightPx = Math.ceil(sliceHeightMm * pxPerMm);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const sliceCtx = sliceCanvas.getContext("2d");

        if (sliceCtx) {
          sliceCtx.fillStyle = "#ffffff";
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0, sourceYPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );

          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.85);
          pdf.addImage(sliceData, "JPEG", margin, margin, imgWidth, sliceHeightMm);
        }

        remainingHeightPx -= sliceHeightPx;
        sourceYPx += sliceHeightPx;
        isFirstPage = false;
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