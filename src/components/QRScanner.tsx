import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (letterId: string) => void;
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
          
          let resolvedId: string | null = null;

          // Try parsing as a full URL first
          try {
            const url = new URL(decodedText);
            resolvedId = url.searchParams.get('id') || url.searchParams.get('track');
          } catch {
            // Not a valid URL — try extracting id param manually from a partial URL string
            const idMatch = decodedText.match(/[?&]id=([^&]+)/);
            const trackMatch = decodedText.match(/[?&]track=([^&]+)/);
            resolvedId = (idMatch?.[1] || trackMatch?.[1]) ?? null;

            // If still nothing, treat the raw text as the ID (UUID or plain string)
            if (!resolvedId && decodedText.trim().length > 0) {
              resolvedId = decodedText.trim();
            }
          }

          if (resolvedId && resolvedId.trim().length > 0) {
            setDecodedData(resolvedId);
            setTrackingId(resolvedId);
            setSuccess(`Valid QR code detected! Ready to track.`);
            setError('');
            scanner.pause();
          } else {
            setError('Invalid QR code: No tracking ID found. Make sure you are scanning a document QR code from this system.');
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
      onScanSuccess(decodedData); // now passing letterId directly
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
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.15)' }}>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--accent-text)' }}>Scan QR Code</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-all hover:opacity-70" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {success && (
            <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#6ee7b7' }} />
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: '#6ee7b7' }}>{success}</p>
                  {trackingId && <p className="text-xs mt-1" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Click "Track Document" to proceed</p>}
                </div>
              </div>
              <button onClick={handleSubmit}
                className="w-full mt-3 px-4 py-2 text-white rounded-xl font-medium transition-all active:scale-95"
                style={{ backgroundColor: 'var(--primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}>
                Track Document
              </button>
              <button onClick={handleTryAgain}
                className="w-full mt-2 px-4 py-2 rounded-xl font-medium transition-all active:scale-95"
                style={{ border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)' }}>
                Scan Another QR Code
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#fca5a5' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                <button onClick={handleTryAgain} className="text-sm underline mt-1" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>Try again</button>
              </div>
            </div>
          )}

          {!success && !error && (
            <div>
              <style>{`
                #qr-reader { background: transparent !important; border: none !important; }
                #qr-reader * { color: white !important; border-color: rgba(255,255,255,0.2) !important; }
                #qr-reader img { filter: invert(1) brightness(2) !important; }
                #qr-reader button { background: var(--primary) !important; color: white !important; border-radius: 8px !important; border: none !important; padding: 6px 14px !important; cursor: pointer !important; }
                #qr-reader button:hover { background: var(--primary-hover) !important; }
                #qr-reader select { background: var(--input-bg) !important; color: white !important; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 6px !important; padding: 4px 8px !important; }
                #qr-reader__scan_region { border: 2px solid rgba(255,255,255,0.25) !important; border-radius: 8px !important; background: rgba(0,0,0,0.2) !important; }
                #qr-reader__scan_region img { filter: invert(1) brightness(2) !important; }
                #qr-reader__dashboard_section_csr span, #qr-reader__dashboard_section_fsr span { color: rgba(255,255,255,0.7) !important; }
                #qr-reader__status_span { color: rgba(255,255,255,0.5) !important; font-size: 11px !important; }
                #qr-reader a { color: var(--accent) !important; }
              `}</style>
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-sm mt-4" style={{ color: 'rgba(var(--accent-rgb),0.7)' }}>
                Point your camera at the QR code or upload an image
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
