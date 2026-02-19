/**
 * Image Processing Utilities
 * Resize and convert images for thermal printer optimization
 */

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Resize image to target width and convert to 16-level grayscale
 * Optimized for thermal receipt printers
 */
export async function processLogoForReceipt(
  file: File,
  targetWidth: number = 512
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.height / img.width;
        const width = targetWidth;
        const height = Math.round(width * aspectRatio);

        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Convert to 16-level grayscale (0, 17, 34, 51, ..., 255)
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale using luminance formula
          const gray = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          );
          
          // Quantize to 16 levels (0-15) then scale to 0-255
          const level = Math.floor(gray / 16);
          const quantized = level * 17;

          // Set RGB to same value (grayscale)
          data[i] = quantized;     // R
          data[i + 1] = quantized; // G
          data[i + 2] = quantized; // B
          // Alpha channel (i+3) unchanged
        }

        // Put processed image back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/png");

        resolve({
          dataUrl,
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Load default logo from public folder
 */
export async function loadDefaultLogo(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load default logo"));
    };
    
    img.src = path;
  });
}