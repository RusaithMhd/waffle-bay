import { EscPosBuilder } from './escpos';
import { hasComplexScript, rasterizeText, rasterizeImageURL } from './rasterizer';
import { PrintJobData, PrinterConfig, StoreProfile } from './types';

/**
 * Utility to wrap a string to a maximum length
 */
function wrapString(str: string, maxLength: number): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;

    // Check if the single word itself is wider than maxLength
    if (word.length > maxLength) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      // Chunk the word
      for (let i = 0; i < word.length; i += maxLength) {
        lines.push(word.slice(i, i + maxLength));
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Align a left and right column string within a total width
 */
export function formatTwoColumns(
  left: string,
  right: string,
  totalWidth: number,
  rightWidth: number = 12
): string[] {
  const leftWidth = totalWidth - rightWidth - 1; // 1 space separator
  const leftLines = wrapString(left, leftWidth);
  const result: string[] = [];

  for (let i = 0; i < leftLines.length; i++) {
    const leftPart = leftLines[i].padEnd(leftWidth, ' ');
    if (i === 0) {
      const rightPart = right.padStart(rightWidth, ' ');
      result.push(`${leftPart} ${rightPart}`);
    } else {
      result.push(`${leftPart} ${''.padStart(rightWidth, ' ')}`);
    }
  }

  return result;
}

/**
 * Main receipt compiler. Compiles order data and store profile settings into ESC/POS bytes.
 */
export async function buildReceiptBytes(
  order: PrintJobData,
  config: PrinterConfig,
  store: StoreProfile
): Promise<Uint8Array> {
  const builder = new EscPosBuilder();
  const cpl = config.charactersPerLine; // E.g., 48 chars
  const dotsWidth = config.dotsPerLine; // E.g., 576 dots

  // Helper to send a line, checking if we need to rasterize it
  const writeLine = (text: string, align: 'left' | 'center' | 'right' = 'left', bold: boolean = false) => {
    if (config.useRasterization && hasComplexScript(text)) {
      // Rasterize the entire line as a bitmap to preserve formatting and font layout
      const img = rasterizeText(text, {
        width: dotsWidth,
        fontSize: 22, // Size matches Font A scale
        bold,
        align,
      });
      if (img) {
        builder.rasterImage(img.width, img.height, img.data);
      } else {
        // Fallback to text if canvas fails
        builder.align(align).bold(bold).textLine(text);
      }
    } else {
      builder.align(align).bold(bold).textLine(text);
    }
  };

  // Helper to draw simple dividers
  const writeDivider = (char: string = '-') => {
    builder.align('left').bold(false);
    builder.divider(char, cpl);
  };

  // --- HEADER SECTION ---
  // Store Logo
  if (config.useRasterization && store.logo_url) {
    const logoImg = await rasterizeImageURL(store.logo_url, dotsWidth);
    if (logoImg) {
      builder.rasterImage(logoImg.width, logoImg.height, logoImg.data);
      builder.feed(1);
    }
  }

  // Store Name (Centered, Bold, Double Size)
  if (config.useRasterization && hasComplexScript(store.store_name)) {
    const img = rasterizeText(store.store_name, {
      width: dotsWidth,
      fontSize: 32, // Large font for name
      bold: true,
      align: 'center',
    });
    if (img) {
      builder.rasterImage(img.width, img.height, img.data);
    } else {
      builder.align('center').bold(true).setTextSize(2, 2).textLine(store.store_name);
    }
  } else {
    builder.align('center').bold(true).setTextSize(2, 2).textLine(store.store_name);
  }

  // Reset text size to normal
  builder.setTextSize(1, 1);

  // Store Address
  if (store.store_address) {
    const addressLines = store.store_address.split('\n');
    addressLines.forEach((line) => {
      if (line.trim()) writeLine(line, 'center');
    });
  }

  // Phone Number
  if (store.phone_number) {
    writeLine(store.phone_number, 'center');
  }

  // Header Note
  if (store.receipt_header) {
    builder.feed(1);
    const headerLines = store.receipt_header.split('\n');
    headerLines.forEach((line) => {
      if (line.trim()) writeLine(line, 'center');
    });
  }

  builder.feed(1);

  // --- METADATA SECTION ---
  const currencySymbol = store.currency_symbol || '$';
  writeLine(`Invoice: ${order.receipt_id}`, 'left', true);
  if (order.order_number) {
    writeLine(`Order No: ${order.order_number}`, 'left');
  }
  if (order.kot_number) {
    writeLine(`KOT Ticket: #${order.kot_number}`, 'left');
  }
  if (order.table_number) {
    writeLine(`Table: ${order.table_number}`, 'left', true);
  }

  const dateStr = order.business_date
    ? new Date(order.business_date + 'T00:00:00').toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const timeStr = new Date(order.created_at).toLocaleString();
  writeLine(`Business Date: ${dateStr}`, 'left');
  writeLine(`Created: ${timeStr}`, 'left');
  
  if (order.offline) {
    writeLine('*** OFFLINE TRANSACTIONS RECORDED ***', 'center', true);
  }

  writeDivider('=');

  // --- ITEMS LIST SECTION ---
  writeLine(formatTwoColumns('Qty Item', 'Amount', cpl)[0], 'left', true);
  writeDivider('-');

  order.items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    const itemLabel = `${item.quantity}x ${item.name}`;
    const priceLabel = `${currencySymbol} ${itemTotal.toFixed(2)}`;

    // Format item line with wrapping and clean spacing
    const lines = formatTwoColumns(itemLabel, priceLabel, cpl);
    lines.forEach((line) => {
      writeLine(line, 'left');
    });

    // Modifiers (indented, e.g. "+ Extra Cheese")
    item.modifiers.forEach((mod) => {
      const modLabel = `  + ${mod.name}`;
      const modPriceLabel = mod.price > 0 ? `${currencySymbol} ${(mod.price * item.quantity).toFixed(2)}` : '';
      const modLines = formatTwoColumns(modLabel, modPriceLabel, cpl);
      modLines.forEach((line) => {
        writeLine(line, 'left');
      });
    });

    // Notes if any
    if (item.notes) {
      const noteLabel = `  Note: ${item.notes}`;
      const noteLines = wrapString(noteLabel, cpl - 2);
      noteLines.forEach((line) => {
        writeLine(`  ${line}`, 'left');
      });
    }
  });

  writeDivider('-');

  // --- TOTALS SECTION ---
  // Subtotal
  writeLine(formatTwoColumns('Subtotal', `${currencySymbol} ${order.subtotal.toFixed(2)}`, cpl)[0], 'left');

  // Discount
  if (order.discount > 0) {
    const discountLabel = order.discount_type === 'percentage'
      ? `Discount (${order.discount_value}%)`
      : `Discount (${currencySymbol}${order.discount_value})`;
    writeLine(
      formatTwoColumns(discountLabel, `-${currencySymbol} ${order.discount.toFixed(2)}`, cpl)[0],
      'left'
    );
  }

  // Tax
  if (order.tax > 0) {
    writeLine(formatTwoColumns('Tax', `${currencySymbol} ${order.tax.toFixed(2)}`, cpl)[0], 'left');
  }

  writeDivider('-');

  // Total (Bold, double size text if ASCII, or large raster)
  const totalLabel = 'TOTAL';
  const totalAmount = `${currencySymbol} ${order.total.toFixed(2)}`;

  if (config.useRasterization && (hasComplexScript(totalLabel) || hasComplexScript(totalAmount))) {
    const textCombined = `${totalLabel.padEnd(cpl - 12)} ${totalAmount.padStart(11)}`;
    const img = rasterizeText(textCombined, {
      width: dotsWidth,
      fontSize: 26,
      bold: true,
      align: 'left',
    });
    if (img) {
      builder.rasterImage(img.width, img.height, img.data);
    } else {
      builder.align('left').bold(true).setTextSize(1, 2).textLine(textCombined);
    }
  } else {
    // Format double height total line
    const totalLines = formatTwoColumns(totalLabel, totalAmount, cpl - 8, 12);
    builder.setTextSize(1, 2); // Double height for emphasis
    totalLines.forEach((line) => {
      builder.align('left').bold(true).textLine(line);
    });
  }

  builder.setTextSize(1, 1); // Reset
  writeDivider('=');

  // --- PAYMENTS SECTION ---
  writeLine('Payments:', 'left', true);
  order.payments.forEach((payment) => {
    const label = `  ${payment.payment_method || 'Cash'}`;
    const amount = `${currencySymbol} ${payment.amount.toFixed(2)}`;
    writeLine(formatTwoColumns(label, amount, cpl)[0], 'left');
  });

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > order.total) {
    const changeAmount = totalPaid - order.total;
    writeLine(
      formatTwoColumns('  Change Due', `${currencySymbol} ${changeAmount.toFixed(2)}`, cpl)[0],
      'left',
      true
    );
  }

  // --- FOOTER SECTION ---
  if (store.receipt_footer) {
    builder.feed(1);
    const footerLines = store.receipt_footer.split('\n');
    footerLines.forEach((line) => {
      if (line.trim()) writeLine(line, 'center');
    });
  }

  // Feed and Cut paper (partial cut standard)
  builder.cut(true, 5);

  return builder.getBuffer();
}
