"use client";

import React, { useState } from 'react';
import { ImageUploader } from '../components/ImageUploader';
import { GradingResult } from '../types';
import { AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [results, setResults] = useState<GradingResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageProcessed = (base64Data: string, displayUrl: string) => {
    setImageSrc(displayUrl);
    setResults(null);
    setError(null);
    gradeImage(base64Data);
  };

  const gradeImage = async (base64Image: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // We send the base64 string directly in a JSON body
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grade image');
      }

      setResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setResults(null);
    setError(null);
  };

  // Helper to convert 0-1000 scale to percentages
  const getBoxStyle = (box: [number, number, number, number]) => {
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Math AI <span className="text-blue-600">Grader</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Upload a handwritten math problem. The AI will check each step, 
            highlight errors, and explain corrections.
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Interface */}
        {!imageSrc ? (
          // Upload State
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <ImageUploader onImageProcessed={handleImageProcessed} isLoading={isLoading} />
          </div>
        ) : (
          // Display/Results State
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Image Canvas & Overlay */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Worksheet</h2>
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Try another
                </button>
              </div>

              <div className="relative w-full bg-gray-200 rounded-lg overflow-hidden border border-gray-300 shadow-inner group">
                {/* The Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imageSrc} 
                  alt="Student Work" 
                  className={`w-full h-auto block object-contain ${isLoading ? 'opacity-50 blur-sm transition-all duration-700' : ''}`}
                />

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium text-blue-900">Grading with AI...</span>
                    </div>
                  </div>
                )}

                {/* Bounding Boxes Overlay */}
                {!isLoading && results && results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`
                      absolute border-2 transition-all duration-300 cursor-help z-10
                      ${result.isCorrect 
                        ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20' 
                        : 'border-red-500 bg-red-500/10 hover:bg-red-500/20'}
                    `}
                    style={getBoxStyle(result.boundingBox)}
                  >
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-xl pointer-events-none z-30">
                      <div className="font-mono text-gray-300 mb-1 border-b border-gray-700 pb-1">
                        Line {result.lineNumber}
                      </div>
                      <div className="font-bold mb-1">
                        {result.isCorrect ? "Correct" : "Incorrect"}
                      </div>
                      <p>{result.explanation || "Good job!"}</p>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Detailed Results List */}
            <div className="lg:col-span-1">
               <h2 className="text-xl font-semibold text-gray-800 mb-4">
                 Grading Report
                 {!isLoading && results && (
                   <span className="ml-2 text-sm font-normal text-gray-500">
                     ({results.filter(r => r.isCorrect).length}/{results.length} Correct)
                   </span>
                 )}
               </h2>
               
               <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                 {isLoading ? (
                    // Skeletons
                    [1,2,3].map(i => (
                      <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))
                 ) : (
                    results?.map((result, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border-l-4 shadow-sm bg-white ${result.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-gray-700 text-sm uppercase tracking-wider">Step {result.lineNumber}</span>
                          {result.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono text-gray-800 mb-2 overflow-x-auto">
                          {result.latex}
                        </div>
                        
                        <p className={`text-sm ${result.isCorrect ? 'text-gray-500' : 'text-red-600 font-medium'}`}>
                          {result.explanation || "Calculation is correct."}
                        </p>
                      </div>
                    ))
                 )}
                 {!isLoading && !results && (
                   <div className="text-gray-400 text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                     Results will appear here
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}