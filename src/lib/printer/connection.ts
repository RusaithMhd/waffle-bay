import { ConnectionState, PrinterConfig, PrinterTransport, LogMessage } from './types';

/**
 * Check if the browser environment supports Web Bluetooth and Web Serial
 */
export function checkBrowserCompatibility() {
  if (typeof window === 'undefined') {
    return {
      isSecure: false,
      bleSupported: false,
      serialSupported: false,
      overall: false,
    };
  }

  const isSecure = window.isSecureContext;
  const bleSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  return {
    isSecure,
    bleSupported,
    serialSupported,
    overall: isSecure && (bleSupported || serialSupported),
  };
}

export class PrinterConnectionManager {
  private static instance: PrinterConnectionManager | null = null;

  // Connection states
  private state: ConnectionState = 'IDLE';
  private transport: PrinterTransport | null = null;
  private activeConfig: PrinterConfig | null = null;

  // BLE State variables
  private bleDevice: any = null; // BluetoothDevice
  private bleGattServer: any = null; // BluetoothRemoteGATTServer
  private bleCharacteristic: any = null; // BluetoothRemoteGATTCharacteristic

  // SPP/Serial State variables
  private sppPort: any = null; // SerialPort
  private sppWriter: any = null; // WritableStreamDefaultWriter

  // Listeners
  private stateListeners = new Set<(state: ConnectionState) => void>();
  private logListeners = new Set<(msg: LogMessage) => void>();

  private constructor() {
    // Setup serial disconnect listeners if supported
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serial' in navigator) {
      const nav = navigator as any;
      nav.serial.addEventListener('disconnect', (event: any) => {
        if (this.sppPort && event.port === this.sppPort) {
          this.log('warn', 'Physical Bluetooth Serial device disconnected.');
          this.handleDisconnect('Physical link lost');
        }
      });
    }
  }

  public static getInstance(): PrinterConnectionManager {
    if (!PrinterConnectionManager.instance) {
      PrinterConnectionManager.instance = new PrinterConnectionManager();
    }
    return PrinterConnectionManager.instance;
  }

  // State methods
  public getState(): ConnectionState {
    return this.state;
  }

  public getTransport(): PrinterTransport | null {
    return this.transport;
  }

  public getActiveConfig(): PrinterConfig | null {
    return this.activeConfig;
  }

  public addStateListener(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener);
    listener(this.state);
  }

  public removeStateListener(listener: (state: ConnectionState) => void) {
    this.stateListeners.delete(listener);
  }

  public addLogListener(listener: (msg: LogMessage) => void) {
    this.logListeners.add(listener);
  }

  public removeLogListener(listener: (msg: LogMessage) => void) {
    this.logListeners.delete(listener);
  }

  private updateState(newState: ConnectionState) {
    this.state = newState;
    this.stateListeners.forEach((listener) => listener(newState));
  }

  private log(level: LogMessage['level'], text: string) {
    const msg: LogMessage = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      text,
    };
    this.logListeners.forEach((listener) => listener(msg));
  }

  /**
   * Main connect router
   */
  public async connect(config: PrinterConfig): Promise<boolean> {
    const compat = checkBrowserCompatibility();
    if (!compat.overall) {
      this.updateState('PRINTER_NOT_SUPPORTED');
      this.log('error', 'Browser does not meet secure context or Web API requirements.');
      return false;
    }

    if (this.state === 'CONNECTED') {
      this.log('info', 'Printer already connected. Reusing session.');
      return true;
    }

    this.activeConfig = config;
    this.transport = config.transport;
    this.updateState('CONNECTING');

    try {
      if (config.transport === 'ble') {
        return await this.connectBLE(config);
      } else {
        return await this.connectSPP(config);
      }
    } catch (err: any) {
      this.updateState('CONNECT_FAILED');
      this.log('error', `Connection error: ${err.message || err}`);
      this.cleanup();
      return false;
    }
  }

  /**
   * Connect via Web Bluetooth (BLE GATT)
   */
  private async connectBLE(config: PrinterConfig): Promise<boolean> {
    this.log('info', `Requesting BLE device with Service UUID: ${config.bleServiceUuid}`);

    const serviceUuid = config.bleServiceUuid.toLowerCase();
    const charUuid = config.bleWriteCharacteristicUuid.toLowerCase();

    // Scan for devices matching service
    const nav = navigator as any;
    this.bleDevice = await nav.bluetooth.requestDevice({
      filters: [{ services: [serviceUuid] }],
    });

    this.log('info', `Found BLE printer: ${this.bleDevice.name || 'Unnamed'}. Connecting to GATT...`);
    this.bleDevice.addEventListener('gattserverdisconnected', this.handleBLEDisconnect);

    // Connect to server
    this.bleGattServer = await this.bleDevice.gatt.connect();
    this.log('info', 'GATT Server connected. Getting service...');

    // Get Primary Service
    const service = await this.bleGattServer.getPrimaryService(serviceUuid);
    this.log('info', 'GATT Service retrieved. Getting print characteristic...');

    // Get Characteristic
    this.bleCharacteristic = await service.getCharacteristic(charUuid);
    this.log('info', 'GATT Print Characteristic retrieved.');

    // Verify characteristic capability
    const props = this.bleCharacteristic.properties;
    const canWrite = props.write || props.writeWithoutResponse;

    if (!canWrite) {
      this.updateState('NO_PRINT_CHARACTERISTIC');
      this.log('error', 'The discovered characteristic does not support write operations.');
      this.disconnect();
      return false;
    }

    this.log('success', `Connected to BLE printer: ${this.bleDevice.name || 'XP-E200L'}`);
    this.updateState('CONNECTED');
    return true;
  }

  /**
   * Connect via Web Serial (Bluetooth Classic SPP RFCOMM)
   */
  private async connectSPP(config: PrinterConfig): Promise<boolean> {
    this.log('info', `Requesting Bluetooth Classic SPP Port with Service Class ID: ${config.sppServiceClassId}`);

    const serviceClassId = config.sppServiceClassId.toLowerCase();

    // Ask user to choose the serial/RFCOMM port
    const nav = navigator as any;
    this.sppPort = await nav.serial.requestPort({
      filters: [{ bluetoothServiceClassId: serviceClassId }],
      allowedBluetoothServiceClassIds: [serviceClassId],
    });

    this.log('info', 'SPP Port selected. Opening serial connection...');
    this.updateState('CONNECTING');

    // Open port
    await this.sppPort.open({ baudRate: config.sppBaudRate });
    this.log('info', `Serial Port opened at ${config.sppBaudRate} baud. Binding writer...`);

    this.sppWriter = this.sppPort.writable.getWriter();

    this.log('success', 'Connected to Classic Bluetooth SPP printer.');
    this.updateState('CONNECTED');
    return true;
  }

  /**
   * Write ESC/POS raw bytes to the physical printer
   */
  public async print(bytes: Uint8Array): Promise<boolean> {
    if (this.state !== 'CONNECTED' && this.state !== 'COMPLETED') {
      this.log('error', `Cannot print. Device is not connected (current state: ${this.state}).`);
      return false;
    }

    this.updateState('PREPARING');
    this.log('info', `Preparing to print job of size ${bytes.length} bytes...`);

    try {
      this.updateState('PRINTING');

      // Use chunk size optimized by transport
      const isBle = this.transport === 'ble';
      const chunkSize = isBle ? 180 : 1024; // BLE MTU chunking vs SPP stream chunking

      this.log('info', `Sending data chunks (size: ${chunkSize} bytes) to printer...`);

      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.slice(offset, offset + chunkSize);

        if (isBle) {
          if (!this.bleCharacteristic) throw new Error('BLE Characteristic lost');
          const props = this.bleCharacteristic.properties;

          if (props.write) {
            await this.bleCharacteristic.writeValueWithResponse(chunk);
          } else {
            await this.bleCharacteristic.writeValueWithoutResponse(chunk);
            // Throttle writeWithoutResponse slightly to let the printer process
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
        } else {
          if (!this.sppWriter) throw new Error('SPP Serial Writer lost');
          await this.sppWriter.write(chunk);
        }
      }

      this.log('success', 'Print bytes transmitted successfully.');
      this.updateState('COMPLETED');
      // Reset back to idle after a brief moment
      setTimeout(() => {
        if (this.state === 'COMPLETED') {
          this.updateState('IDLE');
        }
      }, 1500);

      return true;
    } catch (err: any) {
      this.updateState('WRITE_FAILED');
      this.log('error', `Print write operation failed: ${err.message || err}`);
      return false;
    }
  }

  /**
   * Disconnect and release all hardware hooks
   */
  public async disconnect(): Promise<void> {
    this.log('info', 'Closing printer connection...');
    await this.cleanup();
    this.updateState('IDLE');
    this.log('info', 'Printer connection released.');
  }

  /**
   * Cleans up stale variables and closes connections
   */
  private async cleanup() {
    // 1. Clean BLE GATT connection
    if (this.bleDevice) {
      this.bleDevice.removeEventListener('gattserverdisconnected', this.handleBLEDisconnect);
      if (this.bleDevice.gatt && this.bleDevice.gatt.connected) {
        this.bleDevice.gatt.disconnect();
      }
    }

    // 2. Clean SPP connection
    if (this.sppWriter) {
      try {
        this.sppWriter.releaseLock();
      } catch (e) {}
    }
    if (this.sppPort) {
      try {
        await this.sppPort.close();
      } catch (e) {}
    }

    // Reset handles
    this.bleDevice = null;
    this.bleGattServer = null;
    this.bleCharacteristic = null;
    this.sppPort = null;
    this.sppWriter = null;
    this.transport = null;
  }

  /**
   * Handle physical disconnects
   */
  private handleDisconnect(reason: string) {
    this.cleanup();
    this.updateState('DISCONNECTED');
    this.log('warn', `Session closed. Reason: ${reason}`);
  }

  private handleBLEDisconnect = () => {
    this.log('warn', 'GATT Server reported disconnection.');
    this.handleDisconnect('GATT interface closed');
  };
}
