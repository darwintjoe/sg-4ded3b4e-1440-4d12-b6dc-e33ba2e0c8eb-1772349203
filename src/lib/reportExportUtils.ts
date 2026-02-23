import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Shared utility functions for exporting reports as PDF or images
 * Optimized for efficient file sizes and proper pagination
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
 * Export a chart and table as PDF with smart pagination
 * - Chart always fits on first page (never cut)
 * - Table fits to page width with proper pagination
 * - A4 paper size with proper margins
 * - Compressed images for smaller file size
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

    // Capture chart with lower scale for smaller file size
    const chartCanvas = await html2canvas(chartRef, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    // Compress chart image
    const chartImgData = compressImage(chartCanvas, 0.8);
    
    // Calculate chart dimensions to fit on first page
    const chartAspectRatio = chartCanvas.width / chartCanvas.height;
    let chartWidth = contentWidth;
    let chartHeight = chartWidth / chartAspectRatio;
    
    // Ensure chart fits on first page (leave space for header)
    const maxChartHeight = pageHeight - yOffset - margin - 5;
    if (chartHeight > maxChartHeight) {
      chartHeight = maxChartHeight;
      chartWidth = chartHeight * chartAspectRatio;
    }

    // Center chart horizontally
    const chartX = margin + (contentWidth - chartWidth) / 2;
    
    pdf.addImage(chartImgData, "JPEG", chartX, yOffset, chartWidth, chartHeight, undefined, "FAST");

    // Capture and add table on NEW PAGE if provided
    if (tableRef) {
      pdf.addPage();
      yOffset = margin;

      // Add "Data Table" subtitle
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Data Table", margin, yOffset);
      yOffset += 8;

      const tableCanvas = await html2canvas(tableRef, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        logging: false,
        useCORS: true,
      });

      const tableImgData = compressImage(tableCanvas, 0.75);
      
      // Calculate table dimensions - fit to page width
      const tableAspectRatio = tableCanvas.width / tableCanvas.height;
      const tableWidth = contentWidth;
      const tableHeight = tableWidth / tableAspectRatio;

      // If table fits on one page, add it directly
      const availableHeight = pageHeight - yOffset - margin;
      
      if (tableHeight <= availableHeight) {
        pdf.addImage(tableImgData, "JPEG", margin, yOffset, tableWidth, tableHeight, undefined, "FAST");
      } else {
        // Split table across multiple pages
        const pxPerMm = tableCanvas.width / tableWidth;
        let remainingHeight = tableHeight;
        let sourceY = 0;

        while (remainingHeight > 0) {
          const sliceHeight = Math.min(remainingHeight, availableHeight);
          const sliceHeightPx = sliceHeight * pxPerMm;

          // Create temp canvas for slice
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = tableCanvas.width;
          tempCanvas.height = Math.ceil(sliceHeightPx);
          const ctx = tempCanvas.getContext("2d");
          
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(
              tableCanvas,
              0, sourceY * pxPerMm,
              tableCanvas.width, sliceHeightPx,
              0, 0,
              tableCanvas.width, sliceHeightPx
            );
            
            const sliceData = compressImage(tempCanvas, 0.75);
            pdf.addImage(sliceData, "JPEG", margin, yOffset, tableWidth, sliceHeight, undefined, "FAST");
          }

          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;

          if (remainingHeight > 0) {
            pdf.addPage();
            yOffset = margin;
          }
        }
      }
    }

    // Generate blob and create URL
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Download the file
    pdf.save(`${filename}.pdf`);
    
    // Open in new tab after short delay
    setTimeout(() => {
      window.open(pdfUrl, "_blank");
    }, 500);

    return { success: true, blob: pdfBlob, url: pdfUrl };
  } catch (error) {
    console.error("PDF export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Export a chart and table as JPG image (compressed)
 */
export async function exportChartAsImage(
  chartRef: HTMLElement | null,
  tableRef: HTMLElement | null,
  options: ExportOptions
): Promise<ExportResult> {
  if (!chartRef) {
    return { success: false, error: "Chart element not found" };
  }

  try {
    const { filename } = options;

    // Create a container for both chart and table
    const container = document.createElement("div");
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "20px";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.display = "inline-block";

    // Clone and append chart
    const chartClone = chartRef.cloneNode(true) as HTMLElement;
    chartClone.style.margin = "0";
    container.appendChild(chartClone);

    // Clone and append table if provided
    if (tableRef) {
      const spacer = document.createElement("div");
      spacer.style.height = "20px";
      container.appendChild(spacer);

      const tableClone = tableRef.cloneNode(true) as HTMLElement;
      tableClone.style.margin = "0";
      container.appendChild(tableClone);
    }

    // Temporarily add to body for rendering
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture combined content with lower scale for smaller file
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    // Clean up
    document.body.removeChild(container);

    // Convert to JPG blob with compression
    const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    
    // Download image
    const link = document.createElement("a");
    link.href = jpgDataUrl;
    link.download = `${filename}.jpg`;
    link.click();

    // Open in new tab
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
 * Print report using optimized PDF
 */
export async function printReport(
  chartRef: HTMLElement | null,
  tableRef: HTMLElement | null,
  title: string
): Promise<ExportResult> {
  if (!chartRef) {
    return { success: false, error: "Chart element not found" };
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

    // Capture chart
    const chartCanvas = await html2canvas(chartRef, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      logging: false,
      useCORS: true,
    });

    const chartImgData = compressImage(chartCanvas, 0.8);
    
    // Calculate chart dimensions
    const chartAspectRatio = chartCanvas.width / chartCanvas.height;
    let chartWidth = contentWidth;
    let chartHeight = chartWidth / chartAspectRatio;
    
    const maxChartHeight = pageHeight - yOffset - margin - 5;
    if (chartHeight > maxChartHeight) {
      chartHeight = maxChartHeight;
      chartWidth = chartHeight * chartAspectRatio;
    }

    const chartX = margin + (contentWidth - chartWidth) / 2;
    pdf.addImage(chartImgData, "JPEG", chartX, yOffset, chartWidth, chartHeight, undefined, "FAST");

    // Add table on new page
    if (tableRef) {
      pdf.addPage();
      yOffset = margin;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Data Table", margin, yOffset);
      yOffset += 8;

      const tableCanvas = await html2canvas(tableRef, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        logging: false,
        useCORS: true,
      });

      const tableImgData = compressImage(tableCanvas, 0.75);
      const tableWidth = contentWidth;
      const tableHeight = tableWidth / (tableCanvas.width / tableCanvas.height);
      const availableHeight = pageHeight - yOffset - margin;

      if (tableHeight <= availableHeight) {
        pdf.addImage(tableImgData, "JPEG", margin, yOffset, tableWidth, tableHeight, undefined, "FAST");
      } else {
        // Split across pages
        const pxPerMm = tableCanvas.width / tableWidth;
        let remainingHeight = tableHeight;
        let sourceY = 0;

        while (remainingHeight > 0) {
          const sliceHeight = Math.min(remainingHeight, availableHeight);
          const sliceHeightPx = sliceHeight * pxPerMm;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = tableCanvas.width;
          tempCanvas.height = Math.ceil(sliceHeightPx);
          const ctx = tempCanvas.getContext("2d");
          
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(
              tableCanvas,
              0, sourceY * pxPerMm,
              tableCanvas.width, sliceHeightPx,
              0, 0,
              tableCanvas.width, sliceHeightPx
            );
            
            const sliceData = compressImage(tempCanvas, 0.75);
            pdf.addImage(sliceData, "JPEG", margin, yOffset, tableWidth, sliceHeight, undefined, "FAST");
          }

          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;

          if (remainingHeight > 0) {
            pdf.addPage();
            yOffset = margin;
          }
        }
      }
    }

    // Open print dialog
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Open PDF in new window and trigger print
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