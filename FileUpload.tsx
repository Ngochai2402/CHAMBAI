import React, { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  subLabel?: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  color?: 'teal' | 'indigo';
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  subLabel, 
  accept = "image/*", 
  onFileSelect, 
  selectedFile,
  color = 'teal'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const borderColor = isDragging 
    ? (color === 'teal' ? 'border-teal-500 bg-teal-50' : 'border-indigo-500 bg-indigo-50')
    : (selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white hover:bg-gray-50');

  const iconColor = color === 'teal' ? 'text-teal-500' : 'text-indigo-500';

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
          ${borderColor}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={(e) => e.target.files && onFileSelect(e.target.files[0])}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3 text-green-600">
              <i className="fas fa-check text-xl"></i>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`h-12 w-12 rounded-full ${color === 'teal' ? 'bg-teal-100' : 'bg-indigo-100'} flex items-center justify-center mb-3 ${iconColor}`}>
              <i className="fas fa-cloud-upload-alt text-2xl"></i>
            </div>
            <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
            {subLabel && <p className="text-xs text-gray-500 mt-1">{subLabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
};