import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
 * Export report as PDF - Two-section approach:
 * 1. Chart section → Page 1 (title + stats + chart + buttons)
 * 2. Table section → Page 2+ (data table with pagination)
 */
export async function exportChartAsPDF(
  chartRef: HTMLElement | null,
  tableRef: HTMLElement | null,
  options: ExportOptions
): Promise<ExportResult> {
  if (!chartRef) {
    return { success: false, error: "Chart element not found" };
  }

  try {
    const { filename, pageOrientation = "portrait" } = options;

    // Create PDF with proper dimensions
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

    // 1. Capture and add chart section (page 1)
    const chartCanvas = await html2canvas(chartRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    const chartImgWidth = usableWidth;
    const chartImgHeight = (chartCanvas.height * chartImgWidth) / chartCanvas.width;
    const chartImgData = chartCanvas.toDataURL("image/jpeg", 0.92);

    // Add chart to page 1 (scale down if needed to fit)
    if (chartImgHeight <= usableHeight) {
      pdf.addImage(chartImgData, "JPEG", margin, margin, chartImgWidth, chartImgHeight);
    } else {
      // Scale to fit page height
      const scaledHeight = usableHeight;
      const scaledWidth = (chartCanvas.width * scaledHeight) / chartCanvas.height;
      pdf.addImage(chartImgData, "JPEG", margin, margin, scaledWidth, scaledHeight);
    }

    // 2. Capture and paginate table section (page 2+) if it exists
    if (tableRef) {
      const tableCanvas = await html2canvas(tableRef, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const tableImgWidth = usableWidth;
      const tableImgHeight = (tableCanvas.height * tableImgWidth) / tableCanvas.width;
      const pxPerMm = tableCanvas.width / tableImgWidth;

      // Add new page for table
      pdf.addPage();

      // If table fits on one page, just add it
      if (tableImgHeight <= usableHeight) {
        const tableImgData = tableCanvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(tableImgData, "JPEG", margin, margin, tableImgWidth, tableImgHeight);
      } else {
        // Table needs pagination - slice cleanly across pages
        let remainingHeightPx = tableCanvas.height;
        let sourceYPx = 0;
        let isFirstTablePage = true;

        while (remainingHeightPx > 0) {
          if (!isFirstTablePage) {
            pdf.addPage();
          }

          // Calculate how much content fits on this page
          const sliceHeightMm = Math.min(remainingHeightPx / pxPerMm, usableHeight);
          const sliceHeightPx = Math.ceil(sliceHeightMm * pxPerMm);

          // Create canvas slice for this page
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = tableCanvas.width;
          sliceCanvas.height = sliceHeightPx;
          const sliceCtx = sliceCanvas.getContext("2d");

          if (sliceCtx) {
            // White background
            sliceCtx.fillStyle = "#ffffff";
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            
            // Draw the slice from table canvas
            sliceCtx.drawImage(
              tableCanvas,
              0, sourceYPx,
              tableCanvas.width, sliceHeightPx,
              0, 0,
              tableCanvas.width, sliceHeightPx
            );

            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.85);
            pdf.addImage(sliceData, "JPEG", margin, margin, tableImgWidth, sliceHeightMm);
          }

          remainingHeightPx -= sliceHeightPx;
          sourceYPx += sliceHeightPx;
          isFirstTablePage = false;
        }
      }
    }

    // 3. Save PDF (mobile will show "Open with..." notification)
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
            0, sourceYPx,
            canvas.width, sliceHeightPx,
            0, 0,
            canvas.width, sliceHeightPx
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