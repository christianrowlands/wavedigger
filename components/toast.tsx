'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ 
  id, 
  message, 
  type = 'success', 
  duration = 3000,
  onClose 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'var(--color-success)',
          color: 'white',
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(40, 180, 98, 0.3)'
        };
      case 'error':
        return {
          background: 'var(--color-error)',
          color: 'white',
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(225, 29, 72, 0.3)'
        };
      case 'warning':
        return {
          background: 'var(--color-warning)',
          color: 'black',
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(245, 158, 11, 0.3)'
        };
      case 'info':
        return {
          background: 'var(--color-info)',
          color: 'white',
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(59, 130, 246, 0.3)'
        };
    }
  };

  return (
    <div 
      className="toast-item flex items-center gap-3 px-4 py-3 rounded-lg min-w-[300px] max-w-[500px] animate-slideIn"
      style={getToastStyles()}
    >
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded hover:bg-white/20 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}