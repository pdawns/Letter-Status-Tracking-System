import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [decodedData, setDecodedData] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          formatsToSupport: [0], // 0 = QR_CODE
        },
        false
      );

      scanner.render(
        (decodedText) => {
          console.log('QR Code decoded:', decodedText);
          try {
            const url = new URL(decodedText);
            const trackId = url.searchParams.get('track');
            if (trackId) {
              setDecodedData(decodedText);
              setTrackingId(trackId);
              setSuccess(`Valid QR code detected! Document ID: ${trackId.substring(0, 8)}...`);
              setError('');
              // Stop scanning after successful decode
              scanner.pause();
            } else {
              setError('Invalid QR code: No tracking ID found.');
              setSuccess('');
            }
          } catch {
            setError('Invalid QR code format. Please scan a document QR code from this system.');
            setSuccess('');
          }
        },
        (errorMessage) => {
          // Ignore "not found" errors - these are normal when scanning
          // Only show errors for actual problems
          if (errorMessage && 
              !errorMessage.includes('NotFoundException') && 
              !errorMessage.includes('No MultiFormat Readers') &&
              !errorMessage.includes('No QR code found')) {
            console.log('QR Scanner error:', errorMessage);
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
      console.error('Scanner initialization error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initialize QR scanner. Please check camera permissions.'
      );
    }
  }, [onScanSuccess]);

  const handleSubmit = () => {
    if (decodedData && scannerRef.current) {
      scannerRef.current.clear();
      onScanSuccess(decodedData);
    }
  };

  const handleTryAgain = () => {
    setError('');
    setSuccess('');
    setDecodedData(null);
    setTrackingId(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
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
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{success}</p>
                  {trackingId && (
                    <p className="text-sm mt-1">Click "Track Document" to proceed</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full mt-3 px-4 py-2 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#004526' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9CAF88')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#004526')}
              >
                Track Document
              </button>
              <button
                onClick={handleTryAgain}
                className="w-full mt-2 px-4 py-2 border-2 rounded-lg font-medium transition-colors"
                style={{ borderColor: '#9CAF88', color: '#004526' }}
              >
                Scan Another QR Code
              </button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">{error}</p>
                <button
                  onClick={handleTryAgain}
                  className="text-sm underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
          
          {!success && !error && (
            <div>
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Point your camera at the QR code or upload an image
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
