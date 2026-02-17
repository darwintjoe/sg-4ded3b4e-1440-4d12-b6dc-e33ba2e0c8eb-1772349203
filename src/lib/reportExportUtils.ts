import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Shared utility functions for exporting reports as PDF or images
 */

export interface ExportOptions {
  filename: string;
  title?: string;
  includeTimestamp?: boolean;
  pageOrientation?: "portrait" | "landscape";
}

/**
 * Export a chart and table as PDF
 * @param chartRef - Reference to chart container element
 * @param tableRef - Reference to table container element
 * @param options - Export configuration options
 */
export async function exportChartAsPDF(
  chartRef: HTMLElement | null,
  tableRef: HTMLElement | null,
  options: ExportOptions
): Promise<{ success: boolean; error?: string }> {
  if (!chartRef) {
    return { success: false, error: "Chart element not found" };
  }

  try {
    const { filename, title, includeTimestamp = true, pageOrientation = "portrait" } = options;
    
    const pdf = new jsPDF({
      orientation: pageOrientation,
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yOffset = margin;

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, pageWidth / 2, yOffset, { align: "center" });
      yOffset += 10;
    }

    // Add timestamp if requested
    if (includeTimestamp) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated: ${timestamp}`, pageWidth / 2, yOffset, { align: "center" });
      yOffset += 10;
    }

    // Capture chart
    const chartCanvas = await html2canvas(chartRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });

    const chartImgData = chartCanvas.toDataURL("image/png");
    const chartWidth = pageWidth - 2 * margin;
    const chartHeight = (chartCanvas.height * chartWidth) / chartCanvas.width;

    // Check if chart fits on first page
    if (yOffset + chartHeight > pageHeight - margin) {
      pdf.addPage();
      yOffset = margin;
    }

    pdf.addImage(chartImgData, "PNG", margin, yOffset, chartWidth, chartHeight);
    yOffset += chartHeight + 10;

    // Capture table if provided
    if (tableRef) {
      // Check if we need a new page for table
      if (yOffset + 50 > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin;
      }

      const tableCanvas = await html2canvas(tableRef, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      const tableImgData = tableCanvas.toDataURL("image/png");
      const tableWidth = pageWidth - 2 * margin;
      const tableHeight = (tableCanvas.height * tableWidth) / tableCanvas.width;

      // If table is too tall, split across multiple pages
      let remainingHeight = tableHeight;
      let sourceY = 0; // in PDF units

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - yOffset - margin;
        
        // If available space is too small (e.g. < 20mm), push to next page
        if (availableHeight < 20 && sourceY === 0) {
             pdf.addPage();
             yOffset = margin;
             continue;
        }

        const sliceHeight = Math.min(remainingHeight, availableHeight);

        // Calculate pixel coordinates for slicing
        // tableCanvas.width / tableWidth gives pixels per mm
        const pdfToPx = tableCanvas.width / tableWidth;
        const sX = 0;
        const sY = sourceY * pdfToPx;
        const sWidth = tableCanvas.width;
        const sHeight = sliceHeight * pdfToPx;

        // Create temp canvas for slice
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = sWidth;
        tempCanvas.height = sHeight;
        const ctx = tempCanvas.getContext("2d");
        
        if (ctx) {
             // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
             ctx.drawImage(tableCanvas, sX, sY, sWidth, sHeight, 0, 0, sWidth, sHeight);
             const sliceData = tempCanvas.toDataURL("image/png");
             
             pdf.addImage(sliceData, "PNG", margin, yOffset, tableWidth, sliceHeight, undefined, "FAST");
        }

        remainingHeight -= sliceHeight;
        sourceY += sliceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = margin;
        }
      }
    }

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
 * Export a chart and table as PNG image
 * @param chartRef - Reference to chart container element
 * @param tableRef - Reference to table container element
 * @param options - Export configuration options
 */
export async function exportChartAsImage(
  chartRef: HTMLElement | null,
  tableRef: HTMLElement | null,
  options: ExportOptions
): Promise<{ success: boolean; error?: string }> {
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

    // Clone and append chart
    const chartClone = chartRef.cloneNode(true) as HTMLElement;
    container.appendChild(chartClone);

    // Clone and append table if provided
    if (tableRef) {
      const spacer = document.createElement("div");
      spacer.style.height = "20px";
      container.appendChild(spacer);

      const tableClone = tableRef.cloneNode(true) as HTMLElement;
      container.appendChild(tableClone);
    }

    // Temporarily add to body for rendering
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    // Capture combined content
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });

    // Clean up
    document.body.removeChild(container);

    // Download image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Image export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Generate a filename with timestamp
 * @param prefix - Filename prefix (e.g., "sales-report")
 * @returns Formatted filename with timestamp
 */
export function generateExportFilename(prefix: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `${prefix}_${dateStr}_${timeStr}`;
}