/**
 * Sinhala/Tamil Canvas-based Rasterizer for ESC/POS Printing
 */

/**
 * Check if the text contains Sinhala (\u0D80-\u0DFF) or Tamil (\u0B80-\u0BFF) Unicode blocks
 */
export function hasComplexScript(text: string): boolean {
  const complexScriptRegex = /[\u0d80-\u0dff\u0b80-\u0bff]/;
  return complexScriptRegex.test(text);
}

interface RasterizeOptions {
  width?: number; // Total width in pixels (e.g., 576 for 80mm)
  fontSize?: number; // Font size in pixels (default: 24)
  fontFamily?: string; // Font family (default: 'sans-serif')
  bold?: boolean; // Bold text
  align?: 'left' | 'center' | 'right'; // Horizontal alignment
  lineHeight?: number; // Line height multiplier (default: 1.4)
  paddingTop?: number; // Padding at top (default: 4)
  paddingBottom?: number; // Padding at bottom (default: 4)
}

/**
 * Render text to a monochrome 1-bit bitmask suitable for ESC/POS GS v 0 command
 */
export function rasterizeText(
  text: string,
  options: RasterizeOptions = {}
): { width: number; height: number; data: Uint8Array } | null {
  if (typeof window === 'undefined') {
    return null; // Canvas requires browser environment
  }

  const width = options.width || 576;
  const fontSize = options.fontSize || 24;
  const fontFamily = options.fontFamily || 'system-ui, -apple-system, sans-serif';
  const isBold = options.bold || false;
  const align = options.align || 'left';
  const lineHeightMult = options.lineHeight || 1.4;
  const pt = options.paddingTop || 4;
  const pb = options.paddingBottom || 4;

  // 1. Create offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 2. Set temporary canvas dimensions for measuring
  canvas.width = width;
  canvas.height = 1000; // Large height to avoid clipping during measurements

  // Configure font styling for measurement
  const fontSpec = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
  ctx.font = fontSpec;
  ctx.textBaseline = 'top';

  // 3. Perform word/character wrapping
  const lines = wrapText(ctx, text, width);
  const lineGap = Math.round(fontSize * (lineHeightMult - 1));
  const rowHeight = fontSize + lineGap;
  const height = pt + pb + (lines.length * rowHeight) - lineGap;

  // 4. Resize canvas to exact height needed
  canvas.height = height;

  // 5. Draw content
  // Fill background with solid white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Set up font styling again after canvas resize (resizing clears state)
  ctx.font = fontSpec;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    const y = pt + index * rowHeight;
    let x = 0;

    if (align === 'center') {
      const metrics = ctx.measureText(line);
      x = (width - metrics.width) / 2;
    } else if (align === 'right') {
      const metrics = ctx.measureText(line);
      x = width - metrics.width;
    }

    ctx.fillText(line, x, y);
  });

  // 6. Convert canvas image to monochrome 1-bit array
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Each horizontal byte represents 8 pixels
  const xBytes = Math.ceil(width / 8);
  const packedData = new Uint8Array(xBytes * height);

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < xBytes; xByte++) {
      let byteValue = 0;

      for (let bit = 0; bit < 8; bit++) {
        const xPixel = xByte * 8 + bit;

        // If we exceed the actual image width, pad with white (0 bit)
        if (xPixel < width) {
          const pixelIndex = (y * width + xPixel) * 4;
          const r = pixels[pixelIndex];
          const g = pixels[pixelIndex + 1];
          const b = pixels[pixelIndex + 2];
          // const a = pixels[pixelIndex + 3];

          // Compute grayscale luminance (rec601 formula)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // Black threshold (below 128 is dark / black pixel, above is white)
          // In ESC/POS GS v 0 command: 1 bit = Black, 0 bit = White
          if (luminance < 128) {
            byteValue |= 1 << (7 - bit);
          }
        }
      }

      packedData[y * xBytes + xByte] = byteValue;
    }
  }

  return {
    width,
    height,
    data: packedData,
  };
}

/**
 * Standard word wrapping utility that also handles words wider than maxWidth by splitting them.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Support hard line-breaks in text
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      wrappedLines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Test line width
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
        }

        // If the single word is wider than maxWidth, wrap it character-by-character
        const wordWidth = ctx.measureText(word).width;
        if (wordWidth > maxWidth) {
          let charLine = '';
          for (let j = 0; j < word.length; j++) {
            const char = word[j];
            const testCharLine = charLine + char;
            if (ctx.measureText(testCharLine).width > maxWidth) {
              wrappedLines.push(charLine);
              charLine = char;
            } else {
              charLine = testCharLine;
            }
          }
          currentLine = charLine;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines;
}

/**
 * Load an image from a URL and rasterize it for ESC/POS printing.
 * Centers the image horizontally.
 */
export async function rasterizeImageURL(
  url: string,
  maxWidth: number = 576,
  maxImgHeight: number = 200
): Promise<{ width: number; height: number; data: Uint8Array } | null> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let drawWidth = img.width;
      let drawHeight = img.height;

      // Scale down if it exceeds limits
      if (drawWidth > maxWidth || drawHeight > maxImgHeight) {
        const ratio = Math.min(maxWidth / drawWidth, maxImgHeight / drawHeight);
        drawWidth = Math.round(drawWidth * ratio);
        drawHeight = Math.round(drawHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = maxWidth; // Full paper width to center it
      canvas.height = drawHeight + 20; // Some padding at the bottom
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw centered
      const offsetX = Math.floor((maxWidth - drawWidth) / 2);
      ctx.drawImage(img, offsetX, 0, drawWidth, drawHeight);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      const xBytes = Math.ceil(canvas.width / 8);
      const packedData = new Uint8Array(xBytes * canvas.height);

      for (let y = 0; y < canvas.height; y++) {
        for (let xByte = 0; xByte < xBytes; xByte++) {
          let byteValue = 0;
          for (let bit = 0; bit < 8; bit++) {
            const xPixel = xByte * 8 + bit;
            if (xPixel < canvas.width) {
              const idx = (y * canvas.width + xPixel) * 4;
              const a = pixels[idx + 3];
              // If transparent, assume white (0)
              if (a < 128) continue;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              // Black threshold
              if (luminance < 128) {
                byteValue |= 1 << (7 - bit);
              }
            }
          }
          packedData[y * xBytes + xByte] = byteValue;
        }
      }

      resolve({
        width: canvas.width,
        height: canvas.height,
        data: packedData,
      });
    };
    img.onerror = (err) => {
      console.warn("Failed to load logo for printing", err);
      resolve(null);
    };
    img.src = url;
  });
}
