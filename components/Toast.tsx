'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 font-mono text-xs shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
        type === 'success'
          ? 'border-[#00ff88]/30 bg-[#0a0a0e] text-[#00ff88]'
          : 'border-[#ff4444]/30 bg-[#0a0a0e] text-[#ff6666]'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
