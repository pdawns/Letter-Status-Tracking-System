import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: ['CAMERA'],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultUseBackCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          if (decodedText.includes('track=')) {
            scanner.clear();
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.log('QR Scanner info:', errorMessage);
          }
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initialize QR scanner. Please check camera permissions.'
      );
    }
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Scan QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-2">
                Make sure you've granted camera permissions to this app
              </p>
            </div>
          ) : (
            <div>
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Point your camera at the QR code on the document
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
