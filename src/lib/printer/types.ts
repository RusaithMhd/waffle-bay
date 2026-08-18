export type PrinterTransport = 'ble' | 'spp';

export type ConnectionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'PREPARING'
  | 'PRINTING'
  | 'FEEDING'
  | 'CUTTING'
  | 'COMPLETED'
  // Failure States
  | 'CONNECT_FAILED'
  | 'WRITE_FAILED'
  | 'DISCONNECTED'
  | 'TIMEOUT'
  | 'PRINTER_NOT_SUPPORTED'
  | 'NO_PRINT_CHARACTERISTIC'
  | 'PRINT_CANCELLED';

export interface PrinterConfig {
  transport: PrinterTransport;
  bleServiceUuid: string;
  bleWriteCharacteristicUuid: string;
  sppServiceClassId: string;
  sppBaudRate: number;
  paperWidth: number; // e.g. 80
  dotsPerLine: number; // e.g. 576 or 512
  charactersPerLine: number; // e.g. 48 or 42
  useRasterization: boolean; // Render Sinhala/Tamil as images
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  modifiers: Array<{
    name: string;
    price: number;
  }>;
}

export interface ReceiptPayment {
  payment_method: string;
  amount: number;
}

export interface PrintJobData {
  order_number: string;
  receipt_id: string;
  kot_number?: number;
  business_date?: string;
  table_number?: string;
  created_at: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  discount_type?: 'percentage' | 'amount';
  discount_value?: number;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  offline?: boolean;
}

export interface StoreProfile {
  store_name: string;
  store_address?: string;
  receipt_header?: string;
  receipt_footer?: string;
  currency_symbol: string;
  phone_number?: string;
  logo_url?: string;
}

export interface LogMessage {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  text: string;
}
