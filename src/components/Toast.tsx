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
      className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300"
      style={{
        background: type === 'success'
          ? 'rgba(0,45,20,0.85)'
          : 'rgba(127,29,29,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: type === 'success'
          ? '1px solid rgba(156,175,136,0.35)'
          : '1px solid rgba(239,68,68,0.35)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        color: type === 'success' ? '#DFF5E1' : '#fca5a5',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        minWidth: '220px',
      }}
    >
      {type === 'success'
        ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#9CAF88' }} />
        : <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#fca5a5' }} />
      }
      <span>{message}</span>
    </div>
  );
}
