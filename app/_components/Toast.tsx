'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 print:hidden" role="alert">
      <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-red-200 hover:text-white shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
