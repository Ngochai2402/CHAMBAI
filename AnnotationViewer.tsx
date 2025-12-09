import React, { useState } from 'react';
import { Annotation } from '../types';

interface AnnotationViewerProps {
  imageUrl: string;
  annotations: Annotation[];
}

export const AnnotationViewer: React.FC<AnnotationViewerProps> = ({ imageUrl, annotations }) => {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden group shadow-2xl">
      <img 
        src={imageUrl} 
        alt="Graded Work" 
        className="w-full h-auto object-contain max-h-[600px] mx-auto"
      />
      
      {/* Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {annotations.map((ann, idx) => {
          let icon = "fa-circle";
          let colorClass = "text-gray-500";
          let bgClass = "bg-gray-100";
          
          switch (ann.type) {
            case 'correct':
              icon = "fa-check";
              colorClass = "text-green-600";
              bgClass = "bg-green-100 border-green-500";
              break;
            case 'error':
              icon = "fa-times";
              colorClass = "text-red-600";
              bgClass = "bg-red-100 border-red-500";
              break;
            case 'warning':
              icon = "fa-exclamation";
              colorClass = "text-orange-600";
              bgClass = "bg-orange-100 border-orange-500";
              break;
            case 'info':
              icon = "fa-info";
              colorClass = "text-blue-600";
              bgClass = "bg-blue-100 border-blue-500";
              break;
          }

          // Calculate percentage positions
          const left = `${ann.x * 100}%`;
          const top = `${ann.y * 100}%`;
          
          // Check if annotation is on the right side (to adjust tooltip)
          const isRightSide = ann.x > 0.7;

          return (
            <div 
              key={idx}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 z-10"
              style={{ left, top }}
              onMouseEnter={() => setHoveredAnnotation(idx)}
              onMouseLeave={() => setHoveredAnnotation(null)}
            >
              {/* Annotation Marker */}
              <div className={`w-8 h-8 rounded-full shadow-lg border-2 flex items-center justify-center ${bgClass} ${colorClass}`}>
                <i className={`fas ${icon} font-bold`}></i>
              </div>

              {/* Tooltip (Only show on hover) */}
              {hoveredAnnotation === idx && ann.text && (
                <div 
                  className={`
                    absolute bottom-full mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded shadow-xl z-50 pointer-events-none
                    ${isRightSide ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                  `}
                >
                  {ann.text}
                  {/* Arrow for Tooltip */}
                  <div className={`absolute top-full border-4 border-transparent border-t-gray-900 ${isRightSide ? 'right-3' : 'left-1/2 -translate-x-1/2'}`}></div>
                </div>
              )}
              
              {/* Box highlighter if width/height exist */}
              {ann.width && ann.height && (
                 <div 
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-opacity-60 rounded ${colorClass.replace('text-', 'border-')}`}
                  style={{
                    width: `${ann.width! * 100 * 40}px`, // Heuristic scaling
                    height: `${ann.height! * 100 * 40}px`,
                  }}
                 />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow text-xs flex gap-3">
         <div className="flex items-center gap-1"><i className="fas fa-check text-green-600"></i> Correct</div>
         <div className="flex items-center gap-1"><i className="fas fa-times text-red-600"></i> Error</div>
         <div className="flex items-center gap-1"><i className="fas fa-exclamation text-orange-600"></i> Warning</div>
      </div>
    </div>
  );
};