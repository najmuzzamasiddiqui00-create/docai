'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
  maxSize?: number;
}

export default function UploadZone({ 
  onFileSelect, 
  disabled = false, 
  accept = ".pdf,.doc,.docx,.txt,.csv,.rtf,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.html,.css,.js,.json,.xml",
  maxSize = 10 * 1024 * 1024 // 10MB
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
      return false;
    }

    return true;
  }, [maxSize]);

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${disabled 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
            : isDragging
              ? 'bg-indigo-50 border-indigo-500 scale-[1.02]'
              : 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
          }
        `}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Icon */}
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isDragging 
              ? 'bg-indigo-100 scale-110' 
              : 'bg-gray-100'
            }
          `}>
            <svg 
              className={`w-10 h-10 transition-colors ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>

          {/* Text */}
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
            </p>
            <p className="text-sm text-gray-500 mb-3">
              or click to browse
            </p>
            <p className="text-xs text-gray-400">
              PDF, DOC, DOCX, TXT, Images, XLSX, PPTX, ZIP • Max {(maxSize / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>

          {/* Upload button */}
          {!disabled && (
            <button
              type="button"
              className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Choose File
            </button>
          )}
        </div>

        {/* Pulsing animation when dragging */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500 animate-pulse pointer-events-none"></div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
