/**
 * ESC/POS Command Builder for Thermal Printers
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Get the accumulated byte buffer
   */
  public getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Clear buffer and reinitialize
   */
  public reset(): this {
    this.buffer = [];
    this.initialize();
    return this;
  }

  /**
   * Append raw bytes
   */
  public writeBytes(bytes: number[] | Uint8Array): this {
    if (bytes instanceof Uint8Array) {
      this.buffer.push(...Array.from(bytes));
    } else {
      this.buffer.push(...bytes);
    }
    return this;
  }

  /**
   * Initialize Printer: ESC @ (1B 40)
   */
  public initialize(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * Set Justification: ESC a n (1B 61 n)
   * 0 = Left, 1 = Center, 2 = Right
   */
  public align(justification: 'left' | 'center' | 'right'): this {
    let n = 0;
    if (justification === 'center') n = 1;
    if (justification === 'right') n = 2;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  /**
   * Set Emphasized (Bold): ESC E n (1B 45 n)
   */
  public bold(enable: boolean): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * Set Underline: ESC - n (1B 2D n)
   * 0 = Off, 1 = 1-dot, 2 = 2-dot
   */
  public underline(enable: boolean, doubleDot: boolean = false): this {
    let n = 0;
    if (enable) n = doubleDot ? 2 : 1;
    this.buffer.push(0x1b, 0x2d, n);
    return this;
  }

  /**
   * Set Font Size: GS ! n (1D 21 n)
   * Width scale: 1 to 8
   * Height scale: 1 to 8
   */
  public setTextSize(widthScale: number, heightScale: number): this {
    const w = Math.max(1, Math.min(8, widthScale)) - 1;
    const h = Math.max(1, Math.min(8, heightScale)) - 1;
    const n = (w << 4) | h;
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  /**
   * Set line spacing to default (1/6 inch): ESC 2 (1B 32)
   */
  public setDefaultLineSpacing(): this {
    this.buffer.push(0x1b, 0x32);
    return this;
  }

  /**
   * Set line spacing: ESC 3 n (1B 33 n)
   * n = pitch in dots
   */
  public setLineSpacing(n: number): this {
    this.buffer.push(0x1b, 0x33, Math.max(0, Math.min(255, n)));
    return this;
  }

  /**
   * Print and Feed n lines: ESC d n (1B 64 n)
   */
  public feed(lines: number = 1): this {
    if (lines <= 0) return this;
    this.buffer.push(0x1b, 0x64, lines);
    return this;
  }

  /**
   * Print text as standard ASCII bytes
   */
  public text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Map Unicode character values to ASCII if printable, or question mark
      if (code < 128) {
        this.buffer.push(code);
      } else {
        // Fallback translation for common European accents or symbols
        // Currency symbols
        if (str[i] === '£') this.buffer.push(156); // CP437 Pound
        else if (str[i] === '¥') this.buffer.push(157); // CP437 Yen
        else if (str[i] === '€') this.buffer.push(238); // CP858 Euro (often 238 or 213 depending on code page)
        else {
          this.buffer.push(63); // '?' for unmappable characters
        }
      }
    }
    return this;
  }

  /**
   * Print text followed by a Line Feed
   */
  public textLine(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  /**
   * Draw a horizontal divider line of characters
   */
  public divider(char: string = '-', length: number = 48): this {
    this.textLine(char.repeat(length));
    return this;
  }

  /**
   * Add paper cut command: GS V m (1D 56 m)
   * We use the feed-and-cut standard:
   * m = 66 (0x42) -> feeds paper (cutting position) and performs partial cut
   * m = 65 (0x41) -> feeds paper and performs full cut
   */
  public cut(partial: boolean = true, feedLines: number = 4): this {
    // First, feed a few lines to push printed content past the physical cutter head
    this.feed(feedLines);
    // Cut command
    const m = partial ? 66 : 65;
    this.buffer.push(0x1d, 0x56, m, 0x00);
    return this;
  }

  /**
   * Legacy Cut: ESC m / ESC i
   */
  public legacyCut(partial: boolean = true): this {
    const cmd = partial ? 0x6d : 0x69; // ESC m (partial), ESC i (full)
    this.buffer.push(0x1b, cmd);
    return this;
  }

  /**
   * Print Raster Bit Image: GS v 0 m xL xH yL yH d1...dk
   * Prints a raw binary 1-bit monochrome image.
   *
   * @param width Image width in pixels
   * @param height Image height in pixels
   * @param data Uint8Array containing monochrome 1-bit pixel bytes (8 pixels per byte)
   */
  public rasterImage(width: number, height: number, data: Uint8Array): this {
    // Width in bytes (each byte represents 8 horizontal pixels)
    const xBytes = Math.ceil(width / 8);

    const xL = xBytes & 0xff;
    const xH = (xBytes >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    // Command: GS v 0 m (m=0: Normal density, 203 DPI)
    this.buffer.push(0x1d, 0x76, 0x30, 0, xL, xH, yL, yH);

    // Write image data bytes
    const expectedSize = xBytes * height;
    if (data.length === expectedSize) {
      this.writeBytes(data);
    } else {
      // Pad or slice data to avoid corruption in printer buffer
      const paddedData = new Uint8Array(expectedSize);
      paddedData.set(data.subarray(0, expectedSize));
      this.writeBytes(paddedData);
    }

    return this;
  }
}
