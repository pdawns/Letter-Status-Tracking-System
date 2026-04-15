import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300"
      style={{
        backgroundColor: type === 'success' ? '#9CAF88' : '#b91c1c',
        color: type === 'success' ? '#004526' : 'white',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        minWidth: '220px',
      }}
    >
      {type === 'success'
        ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#004526' }} />
        : <XCircle className="w-5 h-5 flex-shrink-0 text-red-300" />
      }
      <span>{message}</span>
    </div>
  );
}
