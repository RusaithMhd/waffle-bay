'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Wifi, 
  RefreshCw, 
  FileText, 
  Scissors, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Layers, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  PrinterConnectionManager, 
  checkBrowserCompatibility 
} from '@/lib/printer/connection';
import { 
  ConnectionState, 
  PrinterConfig, 
  LogMessage, 
  PrintJobData, 
  StoreProfile 
} from '@/lib/printer/types';
import { buildReceiptBytes } from '@/lib/printer/receipt-builder';
import { EscPosBuilder } from '@/lib/printer/escpos';
import { rasterizeText } from '@/lib/printer/rasterizer';
import { updatePrinterSettings } from '@/app/actions/settings';

export function PrinterConfigTab({ storeSettings }: { storeSettings: any }) {
  const [compat, setCompat] = useState({
    isSecure: false,
    bleSupported: false,
    serialSupported: false,
    usbSupported: false,
    overall: false,
  });

  const [connState, setConnState] = useState<ConnectionState>('IDLE');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Form State
  const [config, setConfig] = useState<PrinterConfig>({
    transport: 'spp',
    bleServiceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
    bleWriteCharacteristicUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
    sppServiceClassId: '00001101-0000-1000-8000-00805f9b34fb',
    sppBaudRate: 9600,
    paperWidth: 80,
    dotsPerLine: 576,
    charactersPerLine: 48,
    useRasterization: true,
  });

  // Load configuration from database or local storage on mount
  useEffect(() => {
    setCompat(checkBrowserCompatibility());

    if (storeSettings && storeSettings.printer_transport) {
      setConfig({
        transport: storeSettings.printer_transport,
        bleServiceUuid: storeSettings.printer_ble_service_uuid || '0000fff0-0000-1000-8000-00805f9b34fb',
        bleWriteCharacteristicUuid: storeSettings.printer_ble_characteristic_uuid || '0000fff1-0000-1000-8000-00805f9b34fb',
        sppServiceClassId: storeSettings.printer_spp_service_class_uuid || '00001101-0000-1000-8000-00805f9b34fb',
        sppBaudRate: Number(storeSettings.printer_spp_baud_rate || 9600),
        paperWidth: Number(storeSettings.printer_paper_width || 80),
        dotsPerLine: Number(storeSettings.printer_dots_per_line || 576),
        charactersPerLine: Number(storeSettings.printer_characters_per_line || 48),
        useRasterization: storeSettings.printer_use_rasterization !== undefined ? storeSettings.printer_use_rasterization : true,
      });
    } else {
      const saved = localStorage.getItem('waffle_bay_printer_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Error loading printer config', e);
        }
      }
    }

    // Bind connection manager listeners
    const manager = PrinterConnectionManager.getInstance();

    const handleStateChange = (state: ConnectionState) => {
      setConnState(state);
    };

    const handleLog = (msg: LogMessage) => {
      setLogs(prev => [...prev, msg].slice(-80)); // Limit to last 80 logs
    };

    manager.addStateListener(handleStateChange);
    manager.addLogListener(handleLog);

    return () => {
      manager.removeStateListener(handleStateChange);
      manager.removeLogListener(handleLog);
    };
  }, [storeSettings]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Save config
  const saveConfig = async (newConfig: PrinterConfig) => {
    setConfig(newConfig);
    localStorage.setItem('waffle_bay_printer_config', JSON.stringify(newConfig));
    
    const toastId = toast.loading('Saving printer settings globally...');
    const res = await updatePrinterSettings(newConfig);
    if (res.success) {
      toast.success('Printer setup updated for all users!', { id: toastId });
    } else {
      toast.error(`Failed to save globally: ${res.error}`, { id: toastId });
    }
  };

  const handleConnect = async () => {
    const manager = PrinterConnectionManager.getInstance();
    toast.loading('Connecting to printer...', { id: 'printer-conn' });
    const success = await manager.connect(config);
    if (success) {
      toast.success('Connected successfully!', { id: 'printer-conn' });
    } else {
      toast.error('Connection failed. View logs below.', { id: 'printer-conn' });
    }
  };

  const handleDisconnect = async () => {
    const manager = PrinterConnectionManager.getInstance();
    await manager.disconnect();
    toast.success('Disconnected printer.');
  };

  // --- DIAGNOSTIC ACTIONS ---

  const runTestPrint = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') {
      toast.error('Printer is not connected.');
      return;
    }

    const dummyOrder: PrintJobData = {
      order_number: 'W-82739',
      receipt_id: 'TXN-2026081701',
      kot_number: 14,
      business_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      subtotal: 1650.0,
      tax: 165.0,
      discount: 100.0,
      total: 1715.0,
      items: [
        {
          name: 'Classic Chocolate Waffle',
          quantity: 1,
          price: 850.0,
          modifiers: [
            { name: 'Extra Whipped Cream', price: 150.0 },
            { name: 'Vanilla Ice Cream Scoop', price: 200.0 },
          ],
        },
        {
          name: 'ලුණු මිරිස් Waffle (Spicy)',
          quantity: 1,
          price: 650.0,
          modifiers: [],
        },
      ],
      payments: [{ payment_method: 'Cash', amount: 2000.0 }],
    };

    const dummyStore: StoreProfile = {
      store_name: storeSettings?.store_name || 'Waffle Bay (வாஃபிள் பே)',
      store_address: storeSettings?.store_address || '123 Galle Road, Colombo 03\nTel: +94 11 234 5678',
      receipt_header: storeSettings?.receipt_header || 'Welcome to Waffle Bay!\nThank you for choosing us.\nவாஃபிள் பே உங்களை வரவேற்கிறது.',
      receipt_footer: storeSettings?.receipt_footer || 'ප්‍රීතිමත් දවසක් වේවා! (Have a Nice Day)\nமீண்டும் வருக! (Come Again)',
      currency_symbol: storeSettings?.currency_symbol || 'LKR',
    };

    try {
      const bytes = await buildReceiptBytes(dummyOrder, config, dummyStore);
      await manager.print(bytes);
      toast.success('Test receipt sent.');
    } catch (e: any) {
      toast.error(`Print failed: ${e.message || e}`);
    }
  };

  const testAlignment = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.align('left').textLine('Left Aligned Text')
           .align('center').textLine('Center Aligned Text')
           .align('right').textLine('Right Aligned Text')
           .feed(4)
           .cut(true);
    await manager.print(builder.getBuffer());
  };

  const testBoldStyles = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.align('center')
           .bold(false).textLine('Normal Text Style')
           .bold(true).textLine('Bold Text Style')
           .underline(true).textLine('Underline Text Style')
           .underline(false).bold(false)
           .setTextSize(2, 2).textLine('Double Size')
           .setTextSize(1, 1)
           .feed(4)
           .cut(true);
    await manager.print(builder.getBuffer());
  };

  const testWrapping = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.align('left')
           .bold(true).textLine('Wrapping Column Test:')
           .bold(false)
           .textLine('The following item name is very long and should wrap on the left while the price column remains cleanly aligned to the right:')
           .feed(1);

    // Format a wrapped two-column line
    const leftText = '1x Double Stack Waffle with Lotus Biscoff, Nutella, Bananas, and Double Whipped Cream Topping';
    const rightText = 'LKR 2,450.00';
    
    // Width character capacity: e.g. 48
    const leftWidth = config.charactersPerLine - 12 - 1; // price occupies 12, space gap is 1
    
    const words = leftText.split(' ');
    const leftLines: string[] = [];
    let current = '';

    words.forEach(word => {
      if (current.length + word.length + 1 <= leftWidth) {
        current = current ? `${current} ${word}` : word;
      } else {
        leftLines.push(current);
        current = word;
      }
    });
    if (current) leftLines.push(current);

    leftLines.forEach((line, idx) => {
      const leftPart = line.padEnd(leftWidth, ' ');
      if (idx === 0) {
        builder.textLine(`${leftPart} ${rightText.padStart(12, ' ')}`);
      } else {
        builder.textLine(`${leftPart} ${''.padStart(12, ' ')}`);
      }
    });

    builder.feed(4).cut(true);
    await manager.print(builder.getBuffer());
  };

  const testSinhalaTamilRaster = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.align('center').bold(true).textLine('Rasterization Test:').bold(false).feed(1);

    // Render local languages to canvas
    const sampleText = 'ලුණු මිරිස් Waffle\nவாஃபிள் பே தமிழ்\nසිංහල සහ தமிழ் graphics rendering';
    
    const img = rasterizeText(sampleText, {
      width: config.dotsPerLine,
      fontSize: 24,
      bold: true,
      align: 'center',
    });

    if (img) {
      builder.rasterImage(img.width, img.height, img.data);
      builder.feed(4).cut(true);
      await manager.print(builder.getBuffer());
      toast.success('Rasterized image printed.');
    } else {
      toast.error('Rasterization failed. Browser canvas unavailable.');
    }
  };

  const handleFeed = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.feed(4);
    await manager.print(builder.getBuffer());
  };

  const handleCut = async () => {
    const manager = PrinterConnectionManager.getInstance();
    if (manager.getState() !== 'CONNECTED') return toast.error('Printer is not connected.');

    const builder = new EscPosBuilder();
    builder.cut(true, 1);
    await manager.print(builder.getBuffer());
  };

  // State colors
  const getStateColorClass = (state: ConnectionState) => {
    switch (state) {
      case 'CONNECTED':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CONNECTING':
      case 'PRINTING':
      case 'FEEDING':
      case 'CUTTING':
      case 'PREPARING':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'CONNECT_FAILED':
      case 'WRITE_FAILED':
      case 'DISCONNECTED':
      case 'TIMEOUT':
      case 'NO_PRINT_CHARACTERISTIC':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl">
      {/* 1. Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Status Card */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between ${getStateColorClass(connState)}`}>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider font-semibold opacity-75">Printer Connection</span>
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-black mt-2">{connState}</h3>
            <p className="text-xs mt-1 opacity-80">
              {connState === 'CONNECTED' ? 'Ready to accept raw jobs.' : 'Waiting to connect.'}
            </p>
          </div>
          
          <div className="mt-4 flex gap-2">
            {connState === 'CONNECTED' ? (
              <button 
                onClick={handleDisconnect}
                className="w-full text-center py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all shadow-sm"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={handleConnect}
                disabled={!compat.overall || connState === 'CONNECTING'}
                className="w-full text-center py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all shadow-sm"
              >
                Connect Printer
              </button>
            )}
          </div>
        </div>

        {/* Compatibility card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Web API Check</span>
              <Wifi className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">HTTPS Context</span>
                {compat.isSecure ? (
                  <span className="flex items-center text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Yes</span>
                ) : (
                  <span className="flex items-center text-rose-600 font-medium"><XCircle className="w-3.5 h-3.5 mr-1" /> No</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Web Bluetooth (BLE)</span>
                {compat.bleSupported ? (
                  <span className="flex items-center text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Supported</span>
                ) : (
                  <span className="flex items-center text-rose-600 font-medium"><XCircle className="w-3.5 h-3.5 mr-1" /> Unavailable</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Web Serial (RFCOMM)</span>
                {compat.serialSupported ? (
                  <span className="flex items-center text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Supported</span>
                ) : (
                  <span className="flex items-center text-rose-600 font-medium"><XCircle className="w-3.5 h-3.5 mr-1" /> Unavailable</span>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">WebUSB (Wired USB)</span>
                {compat.usbSupported ? (
                  <span className="flex items-center text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Supported</span>
                ) : (
                  <span className="flex items-center text-rose-600 font-medium"><XCircle className="w-3.5 h-3.5 mr-1" /> Unavailable</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 mt-4 border-t pt-2">
            {!compat.overall && (
              <span className="text-rose-600 font-semibold flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0" /> Secure Context required.
              </span>
            )}
            {compat.overall && <span className="text-emerald-600 font-semibold">Web Serial/Bluetooth API available.</span>}
          </div>
        </div>

        {/* Paper specifications Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Paper Profile</span>
              <Layers className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Paper Width:</span>
                <span className="font-bold text-gray-900">{config.paperWidth} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Density:</span>
                <span className="font-bold text-gray-900">{config.dotsPerLine} px / line</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chars per Line:</span>
                <span className="font-bold text-gray-900">{config.charactersPerLine} cpl (Font A)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transport:</span>
                <span className="font-bold text-gray-900 uppercase">{config.transport}</span>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-gray-400 mt-4 border-t pt-2">
            Supports BLE, Classic Bluetooth (SPP), and USB printers.
          </div>
        </div>
      </div>

      {/* 2. Configuration Settings Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900">Communication Parameters</h3>
          <p className="text-xs text-gray-500">Tune the browser driver to matches your physical XP-E200L interface.</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transport mode selector */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Connection Type</label>
              <select 
                value={config.transport}
                onChange={e => saveConfig({ ...config, transport: e.target.value as any })}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="spp">Bluetooth Classic / SPP (Web Serial — Desktop Chrome/Edge)</option>
                <option value="ble">Bluetooth Low Energy — BLE GATT (Android / iOS / All Devices)</option>
                <option value="usb">USB — Wired USB via WebUSB (Chrome / Edge, Any OS)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                {config.transport === 'ble' && 'Use BLE on Android tablets and phones. Works on all platforms. Falls back to full scan if the printer UUID isn\'t broadcast.'}
                {config.transport === 'spp' && 'Bluetooth Classic SPP via Web Serial RFCOMM. Best for desktop Chrome/Edge. Fastest throughput.'}
                {config.transport === 'usb' && 'Wired USB via WebUSB. Plug the printer in via USB cable. Works on any OS with Chrome or Edge — no drivers needed.'}
              </p>
            </div>

            {/* SPP Configurations */}
            {config.transport === 'spp' && (
              <div className="p-4 bg-orange-50/30 border border-orange-100 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">SPP Service Class ID (RFCOMM)</label>
                  <input 
                    type="text" 
                    value={config.sppServiceClassId}
                    onChange={e => saveConfig({ ...config, sppServiceClassId: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Baud Rate</label>
                  <select 
                    value={config.sppBaudRate}
                    onChange={e => saveConfig({ ...config, sppBaudRate: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="9600">9600 (Standard)</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="115200">115200</option>
                  </select>
                </div>
              </div>
            )}

            {/* BLE Configurations */}
            {config.transport === 'ble' && (
              <div className="p-4 bg-orange-50/30 border border-orange-100 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BLE Service UUID</label>
                  <input 
                    type="text" 
                    value={config.bleServiceUuid}
                    onChange={e => saveConfig({ ...config, bleServiceUuid: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono bg-white"
                    placeholder="e.g. 0000fff0-0000-1000-8000-00805f9b34fb"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BLE Write Characteristic UUID</label>
                  <input 
                    type="text" 
                    value={config.bleWriteCharacteristicUuid}
                    onChange={e => saveConfig({ ...config, bleWriteCharacteristicUuid: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs font-mono bg-white"
                    placeholder="e.g. 0000fff1-0000-1000-8000-00805f9b34fb"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Paper Formatting details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Density & Columns</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Characters per Line</label>
                  <input 
                    type="number" 
                    value={config.charactersPerLine}
                    onChange={e => saveConfig({ ...config, charactersPerLine: Math.max(20, Number(e.target.value)) })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Dot Width (Pixels)</label>
                  <input 
                    type="number" 
                    value={config.dotsPerLine}
                    onChange={e => saveConfig({ ...config, dotsPerLine: Math.max(100, Number(e.target.value)) })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>
            
            {/* Paper Width */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Paper Width (mm)</label>
              <select
                value={config.paperWidth}
                onChange={e => saveConfig({ ...config, paperWidth: Number(e.target.value),
                  dotsPerLine: Number(e.target.value) === 58 ? 384 : 576,
                  charactersPerLine: Number(e.target.value) === 58 ? 32 : 48
                })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value={58}>58 mm (32 chars, 384 dots)</option>
                <option value={80}>80 mm (48 chars, 576 dots) — Standard</option>
              </select>
            </div>

            {/* Unicode rasterization */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="flex items-start">
                <input 
                  id="rasterCheckbox"
                  type="checkbox"
                  checked={config.useRasterization}
                  onChange={e => saveConfig({ ...config, useRasterization: e.target.checked })}
                  className="mt-1 h-4.5 w-4.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="rasterCheckbox" className="ml-3 block text-xs font-semibold text-gray-700">
                  Enable Sinhala & Tamil Canvas Rasterizer
                  <span className="block font-normal text-[11px] text-gray-400 mt-1">
                    When checked, Sinhala and Tamil characters are rendered to high-quality graphics bytes in the browser. 
                    This ensures correct rendering even if the printer lacks hardware font chips.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Diagnostic tests console */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900">Diagnostic Suite</h3>
            <p className="text-xs text-gray-500">Run formatting, feed, cutter, and multi-lingual checks on connected printer.</p>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${connState === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
            {connState === 'CONNECTED' ? 'Active' : 'Offline'}
          </span>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button 
            onClick={runTestPrint}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <FileText className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Print Receipt</span>
          </button>
          
          <button 
            onClick={testAlignment}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Test Alignments</span>
          </button>

          <button 
            onClick={testBoldStyles}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <Terminal className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Bold & Styles</span>
          </button>

          <button 
            onClick={testWrapping}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <FileText className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Long Wrapping</span>
          </button>

          <button 
            onClick={testSinhalaTamilRaster}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <Layers className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Raster Languages</span>
          </button>

          <button 
            onClick={handleFeed}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Feed Paper</span>
          </button>

          <button 
            onClick={handleCut}
            className="p-3 bg-gray-50 border border-gray-200 hover:border-orange-500 text-left rounded-xl hover:bg-orange-50/20 active:scale-95 transition-all group flex flex-col justify-between min-h-[96px]"
          >
            <Scissors className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
            <span className="text-xs font-bold text-gray-800 block mt-2">Cut Paper</span>
          </button>

          <div 
            onClick={() => {
              if (connState === 'CONNECTED') handleDisconnect();
              else handleConnect();
            }}
            className="p-3 bg-orange-100 hover:bg-orange-200 border border-orange-200 text-left rounded-xl active:scale-95 transition-all flex flex-col justify-between min-h-[96px] cursor-pointer"
          >
            <Printer className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-extrabold text-orange-950 block mt-2">
              {connState === 'CONNECTED' ? 'Disconnect link' : 'Quick Connect'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Logs Console Output */}
      <div className="bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0f172a] flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></div>
            <h3 className="font-bold text-slate-200 text-sm font-mono">Hardware Console Logs</h3>
          </div>
          <button 
            onClick={() => setLogs([])}
            className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 border border-slate-800 rounded bg-[#1e293b]"
          >
            Clear Console
          </button>
        </div>

        <div className="p-4 h-64 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No output logs recorded. Press "Connect Printer" to begin...</p>
          ) : (
            logs.map((log, idx) => {
              let logColor = 'text-slate-300';
              if (log.level === 'error') logColor = 'text-rose-400 font-semibold';
              if (log.level === 'warn') logColor = 'text-amber-300';
              if (log.level === 'success') logColor = 'text-emerald-400 font-semibold';

              return (
                <div key={idx} className="flex">
                  <span className="text-slate-500 mr-2 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={logColor}>{log.text}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
