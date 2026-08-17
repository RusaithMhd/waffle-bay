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
    const serviceUuid = config.bleServiceUuid.toLowerCase();
    const charUuid = config.bleWriteCharacteristicUuid.toLowerCase();
    const nav = navigator as any;

    let device = null;

    // 1. Try silent reconnection if supported
    if (nav.bluetooth && 'getDevices' in nav.bluetooth) {
      try {
        const approvedDevices = await nav.bluetooth.getDevices();
        this.log('info', `Checking ${approvedDevices.length} previously approved BLE devices...`);
        
        // Find a device that is likely our printer
        device = approvedDevices.find((d: any) => {
          const name = (d.name || '').toLowerCase();
          return name.includes('printer') || name.includes('xp-') || name.includes('xprinter');
        });

        if (!device && approvedDevices.length > 0) {
          device = approvedDevices[0];
        }

        if (device) {
          this.log('info', `Reusing previously approved BLE device: ${device.name || 'Unnamed'}`);
        }
      } catch (e) {
        this.log('warn', `Failed to query pre-approved BLE devices: ${e}`);
      }
    }

    // 2. If no approved device found, prompt the user
    if (!device) {
      this.log('info', `Requesting BLE device with Service UUID: ${config.bleServiceUuid}`);
      device = await nav.bluetooth.requestDevice({
        filters: [{ services: [serviceUuid] }],
      });
    }

    this.bleDevice = device;
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
    const serviceClassId = config.sppServiceClassId.toLowerCase();
    const nav = navigator as any;

    let port = null;

    // 1. Try silent reconnection if supported
    if (nav.serial && 'getPorts' in nav.serial) {
      try {
        const approvedPorts = await nav.serial.getPorts();
        this.log('info', `Checking ${approvedPorts.length} previously approved Serial ports...`);
        
        // Find by service class ID matching
        port = approvedPorts.find((p: any) => {
          const info = p.getInfo();
          return info.bluetoothServiceClassId?.toLowerCase() === serviceClassId;
        });

        // Fallback to first port if exactly one is present
        if (!port && approvedPorts.length > 0) {
          port = approvedPorts[0];
        }

        if (port) {
          this.log('info', 'Reusing previously approved Serial port.');
        }
      } catch (e) {
        this.log('warn', `Failed to query pre-approved Serial ports: ${e}`);
      }
    }

    // 2. Prompt user if no approved port is found
    if (!port) {
      this.log('info', `Requesting Bluetooth Classic SPP Port with Service Class ID: ${config.sppServiceClassId}`);
      port = await nav.serial.requestPort({
        filters: [{ bluetoothServiceClassId: serviceClassId }],
        allowedBluetoothServiceClassIds: [serviceClassId],
      });
    }

    this.sppPort = port;
    this.log('info', 'SPP Port selected. Opening serial connection...');
    this.updateState('CONNECTING');

    // Open port
    await this.sppPort.open({ baudRate: config.sppBaudRate });
    this.log('info', `Serial Port opened at ${config.sppBaudRate} baud.`);

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

    const isBle = this.transport === 'ble';
    const chunkSize = isBle ? 180 : 1024; // BLE MTU chunking vs SPP stream chunking
    let writer: any = null;

    try {
      this.updateState('PRINTING');
      this.log('info', `Sending data chunks (size: ${chunkSize} bytes) to printer...`);

      if (!isBle) {
        if (!this.sppPort || !this.sppPort.writable) {
          throw new Error('SPP Serial port is not writable.');
        }
        writer = this.sppPort.writable.getWriter();
      }

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
          await writer.write(chunk);
        }
      }

      this.log('success', 'Print bytes transmitted successfully.');
      this.updateState('COMPLETED');
      // Auto-disconnect after a brief moment to allow hardware buffers to print and cut,
      // and prevent stale port locks or unexpected logical drops.
      setTimeout(async () => {
        if (this.state === 'COMPLETED') {
          this.log('info', 'Auto-releasing printer connection to free the channel...');
          await this.disconnect();
        }
      }, 2000);

      return true;
    } catch (err: any) {
      this.updateState('WRITE_FAILED');
      this.log('error', `Print write operation failed: ${err.message || err}`);
      
      // If error message indicates connection drop, trigger auto cleanup/disconnect
      const errMsg = (err.message || '').toLowerCase();
      if (
        errMsg.includes('disconnect') || 
        errMsg.includes('close') || 
        errMsg.includes('abort') || 
        errMsg.includes('device lost') ||
        errMsg.includes('released')
      ) {
        this.handleDisconnect('Write error indicates link closure');
      }
      
      return false;
    } finally {
      if (writer) {
        try {
          writer.releaseLock();
        } catch (e) {}
      }
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
    const wasSuccessful = this.state === 'COMPLETED' || this.state === 'IDLE';
    this.cleanup();
    
    if (wasSuccessful) {
      this.updateState('IDLE');
      this.log('info', `Printer connection closed cleanly (Idle/Cutter release). Reason: ${reason}`);
    } else {
      this.updateState('DISCONNECTED');
      this.log('warn', `Session closed unexpectedly. Reason: ${reason}`);
    }
  }

  private handleBLEDisconnect = () => {
    this.log('warn', 'GATT Server reported disconnection.');
    this.handleDisconnect('GATT interface closed');
  };
}
