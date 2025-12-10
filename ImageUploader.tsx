import React, { useRef, useState } from 'react';
import { Upload, FileImage, Loader2, RefreshCcw } from 'lucide-react';

interface ImageUploaderProps {
  onImageProcessed: (base64Image: string, displayUrl: string) => void;
  isLoading: boolean;
}

const MAX_WIDTH = 1024; // Max dimension for standard Gemini input
const QUALITY = 0.8; // JPEG quality

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageProcessed, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Read file as Data URL
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // 2. Setup Canvas for resizing
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize logic: maintain aspect ratio, max 1024px
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_WIDTH) {
              width = Math.round((width * MAX_WIDTH) / height);
              height = MAX_WIDTH;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // 3. Export as compressed JPEG
            // This base64 string includes the data:image/jpeg;base64 prefix
            const compressedBase64 = canvas.toDataURL('image/jpeg', QUALITY);
            
            // Pass back to parent
            onImageProcessed(compressedBase64, compressedBase64);
          }
          setIsProcessing(false);
        };
      };
    } catch (error) {
      console.error("Compression error:", error);
      alert("Failed to process image.");
      setIsProcessing(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <button
        onClick={triggerUpload}
        disabled={isLoading || isProcessing}
        className={`
          flex items-center justify-center gap-2 w-full py-8 px-4 
          border-2 border-dashed rounded-xl transition-all duration-200
          ${isLoading || isProcessing 
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-400' 
            : 'bg-white border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-blue-600 cursor-pointer shadow-sm'}
        `}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">Compressing Image...</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6" />
            <span className="font-medium text-lg">
              {isLoading ? "Analyzing..." : "Upload Math Worksheet"}
            </span>
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-2">
        Optimized for handwritten math. Max 1024px.
      </p>
    </div>
  );
};
