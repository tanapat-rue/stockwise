import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000); // Auto close after 3s

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const bgColors = {
    success: 'bg-white border-l-4 border-green-500',
    error: 'bg-white border-l-4 border-red-500',
    info: 'bg-white border-l-4 border-blue-500'
  };

  return (
    <div className={`flex items-center p-4 mb-3 w-full max-w-sm rounded-lg shadow-lg transform transition-all animate-slide-up ${bgColors[toast.type]} dark:bg-gray-800 dark:text-white`}>
      <div className="flex-shrink-0">
        {icons[toast.type]}
      </div>
      <div className="ml-3 text-sm font-medium">
        {toast.message}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex h-8 w-8 text-gray-500"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;