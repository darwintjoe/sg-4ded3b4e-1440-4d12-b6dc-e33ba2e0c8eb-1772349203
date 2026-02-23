import html2canvas from "html2canvas";

export interface ShareOptions {
  filename: string;
  title?: string;
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * Share report as image using native Web Share API
 * Opens system share sheet (WhatsApp, Gmail, Save to Files, etc.)
 */
export async function shareReportAsImage(
  reportRef: HTMLElement | null,
  options: ShareOptions
): Promise<ShareResult> {
  if (!reportRef) {
    return { success: false, error: "Report element not found" };
  }

  // Check if Web Share API is supported
  if (!navigator.share || !navigator.canShare) {
    return { 
      success: false, 
      error: "Sharing is not supported on this device. Please use a modern mobile browser." 
    };
  }

  try {
    const { filename, title } = options;

    // Capture entire report as image
    const canvas = await html2canvas(reportRef, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create image blob"));
        }
      }, "image/jpeg", 0.92);
    });

    // Create file from blob
    const file = new File([blob], `${filename}.jpg`, { type: "image/jpeg" });

    // Check if file can be shared
    if (!navigator.canShare({ files: [file] })) {
      return { 
        success: false, 
        error: "Image sharing is not supported on this device" 
      };
    }

    // Open native share sheet
    await navigator.share({
      files: [file],
      title: title || filename,
    });

    return { success: true };
  } catch (error) {
    // User cancelled share sheet
    if (error instanceof Error && error.name === "AbortError") {
      return { success: true }; // Not an error, user just cancelled
    }

    console.error("Share failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Share failed",
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