import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import { Camera, Upload, X, ScanLine, FileImage } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

type Tab = 'camera' | 'upload';

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [tab, setTab] = useState<Tab>('upload');
  const [cameraError, setCameraError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [readError, setReadError] = useState('');
  const [reading, setReading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Start camera
  useEffect(() => {
    if (tab !== 'camera') return;
    setCameraError('');

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanFrame();
        }
      })
      .catch(() => setCameraError('Camera permission denied. Please allow camera access.'));

    return () => stopCamera();
  }, [tab]);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      stopCamera();
      onScanSuccess(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadedFile(file);
    setReadError('');
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const decodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code ? code.data : null;
  };

  const handleReadQR = async () => {
    if (!uploadedFile) return;
    setReading(true);
    setReadError('');

    try {
      if (uploadedFile.type === 'application/pdf') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const result = decodeFromCanvas(canvas);
          if (result) { onScanSuccess(result); return; }
        }
        setReadError('No QR code found in the PDF. Make sure the QR code is visible and clear.');
      } else {
        const img = new Image();
        img.src = URL.createObjectURL(uploadedFile);
        await new Promise((res) => { img.onload = res; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const result = decodeFromCanvas(canvas);
        if (result) { onScanSuccess(result); return; }
        setReadError('No QR code found in the image. Make sure the QR code is clear and not cropped.');
      }
    } catch {
      setReadError('Failed to process the file. Please try again.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" style={{ color: '#004526' }} />
            <h2 className="text-base font-semibold text-gray-900">Scan QR Code</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['upload', 'camera'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'border-b-2' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={tab === t ? { borderColor: '#004526', color: '#004526' } : {}}
            >
              {t === 'camera' ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {t === 'camera' ? 'Use Camera' : 'Upload Image / PDF'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Upload tab */}
          {tab === 'upload' && (
            <div className="space-y-3">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center hover:opacity-80 transition-opacity"
                  style={{ borderColor: '#9CAF88', backgroundColor: '#DFF5E1' }}
                >
                  <FileImage className="w-8 h-8 mx-auto mb-2" style={{ color: '#004526' }} />
                  <p className="text-sm font-medium" style={{ color: '#004526' }}>
                    {uploadedFile ? uploadedFile.name : 'Click to choose a file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF supported</p>
                </div>
              </label>

              {/* Image preview */}
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img src={previewUrl} alt="Preview" className="w-full object-contain max-h-64" />
                </div>
              )}

              {uploadedFile && uploadedFile.type === 'application/pdf' && (
                <div className="rounded-lg p-3 text-sm text-gray-600" style={{ backgroundColor: '#DFF5E1' }}>
                  PDF selected: <span className="font-medium">{uploadedFile.name}</span>
                </div>
              )}

              {readError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {readError}
                </div>
              )}

              <button
                onClick={handleReadQR}
                disabled={!uploadedFile || reading}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#004526' }}
              >
                {reading ? 'Reading QR Code...' : 'Read QR Code'}
              </button>
            </div>
          )}

          {/* Camera tab */}
          {tab === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                  <p className="font-medium">{cameraError}</p>
                  <p className="text-xs mt-1">Try uploading an image instead.</p>
                </div>
              ) : (
                <>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white rounded-lg opacity-70" />
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <p className="text-center text-xs text-gray-500">
                    Point your camera at the QR code. It will scan automatically.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
