import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnnotationViewer } from './components/AnnotationViewer';
import { StatsChart } from './components/StatsChart';
import { gradeSubmission, generateVisualAid } from './services/geminiService';
import { StudentSubmission, GradingStatus, BatchStats } from './types';

const App: React.FC = () => {
  // State
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [students, setStudents] = useState<StudentSubmission[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("Math Quiz 1");
  const [isGrading, setIsGrading] = useState(false);

  // Computed Stats
  const stats: BatchStats = {
    total: students.length,
    graded: students.filter(s => s.status === GradingStatus.COMPLETED).length,
    averageScore: 0,
    passRate: 0
  };

  if (stats.graded > 0) {
    const totalScore = students.reduce((sum, s) => sum + (s.result?.score || 0), 0);
    stats.averageScore = parseFloat((totalScore / stats.graded).toFixed(1));
    const passed = students.filter(s => (s.result?.score || 0) >= 5).length;
    stats.passRate = Math.round((passed / stats.graded) * 100);
  }

  const distribution = {
    excellent: students.filter(s => (s.result?.score || 0) >= 9).length,
    good: students.filter(s => (s.result?.score || 0) >= 7 && (s.result?.score || 0) < 9).length,
    average: students.filter(s => (s.result?.score || 0) >= 5 && (s.result?.score || 0) < 7).length,
    poor: students.filter(s => s.status === GradingStatus.COMPLETED && (s.result?.score || 0) < 5).length,
  };

  // Handlers
  const handleAddStudent = (file: File) => {
    const newStudent: StudentSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Student ${students.length + 1}`, // In a real app, parse name from filename
      file,
      previewUrl: URL.createObjectURL(file),
      status: GradingStatus.IDLE
    };
    setStudents(prev => [...prev, newStudent]);
    if (!selectedStudentId) setSelectedStudentId(newStudent.id);
  };

  const startBatchGrading = async () => {
    setIsGrading(true);
    
    // Process one by one to avoid rate limits
    const studentsToGrade = students.filter(s => s.status === GradingStatus.IDLE || s.status === GradingStatus.ERROR);
    
    for (const student of studentsToGrade) {
      // Update status to processing
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: GradingStatus.PROCESSING } : s));
      
      try {
        const result = await gradeSubmission(student.file, answerKey);
        
        // Optional: Generate visual aid if concept is provided
        let visualAidUrl = undefined;
        if (result.conceptDescription) {
             visualAidUrl = await generateVisualAid(result.conceptDescription) || undefined;
        }

        const finalResult = { ...result, visualAidUrl };

        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: GradingStatus.COMPLETED, result: finalResult } : s));
      } catch (error) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: GradingStatus.ERROR, error: (error as Error).message } : s));
      }
    }
    
    setIsGrading(false);
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-teal-500 to-indigo-600 text-white p-2 rounded-lg shadow-lg">
              <i className="fas fa-shapes text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Visual Math Grader <span className="text-teal-600">AI</span></h1>
              <p className="text-xs text-gray-500 font-medium">v6.5 • Gemini 2.5 & Imagen 3</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Stats Pill */}
             <div className="hidden md:flex items-center gap-4 bg-slate-100 px-4 py-1.5 rounded-full text-sm font-medium text-gray-600">
               <span><i className="fas fa-file-alt mr-2 text-gray-400"></i>{stats.graded}/{stats.total} Graded</span>
               <span className="w-px h-4 bg-gray-300"></span>
               <span><i className="fas fa-chart-line mr-2 text-teal-500"></i>Avg: {stats.averageScore}</span>
             </div>
             <button 
               onClick={startBatchGrading}
               disabled={isGrading || students.length === 0}
               className={`
                 px-5 py-2 rounded-full font-semibold shadow-md transition-all flex items-center gap-2
                 ${isGrading || students.length === 0 
                   ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                   : 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5'}
               `}
             >
               {isGrading ? <><i className="fas fa-spinner fa-spin"></i> Grading...</> : <><i className="fas fa-magic"></i> Grade Batch</>}
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Left Sidebar: Inputs & List */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* 1. Configuration Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-cog text-gray-400"></i> Setup
              </h2>
              <div className="space-y-4">
                <div>
                   <label className="text-xs font-semibold text-gray-500">Batch Name</label>
                   <input 
                     type="text" 
                     value={batchName}
                     onChange={(e) => setBatchName(e.target.value)}
                     className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                   />
                </div>
                <FileUpload 
                  label="Answer Key (Optional)" 
                  subLabel="Reference solution"
                  color="indigo"
                  selectedFile={answerKey}
                  onFileSelect={setAnswerKey}
                />
                <FileUpload 
                  label="Add Student Work" 
                  subLabel="Upload image"
                  color="teal"
                  onFileSelect={handleAddStudent}
                />
              </div>
            </div>

            {/* 2. Students List */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[300px]">
              <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center justify-between">
                <span><i className="fas fa-users text-gray-400 mr-2"></i> Students</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{students.length}</span>
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {students.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                    <i className="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                    <p className="text-sm">No students yet</p>
                  </div>
                ) : (
                  students.map(student => (
                    <div 
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`
                        p-3 rounded-xl cursor-pointer border transition-all duration-200 group
                        ${selectedStudentId === student.id 
                          ? 'bg-teal-50 border-teal-200 shadow-sm' 
                          : 'bg-white border-gray-100 hover:border-teal-100 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-semibold text-sm ${selectedStudentId === student.id ? 'text-teal-800' : 'text-gray-700'}`}>
                          {student.name}
                        </span>
                        {student.status === GradingStatus.COMPLETED && (
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-bold
                            ${(student.result?.score || 0) >= 7 ? 'bg-green-100 text-green-700' : 
                              (student.result?.score || 0) >= 5 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}
                          `}>
                            {student.result?.score}/10
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-1.5 text-gray-500">
                           <i className="fas fa-image"></i>
                           <span className="truncate max-w-[100px]">{student.file.name}</span>
                         </div>
                         {student.status === GradingStatus.PROCESSING && <i className="fas fa-circle-notch fa-spin text-teal-500"></i>}
                         {student.status === GradingStatus.IDLE && <span className="w-2 h-2 rounded-full bg-gray-300"></span>}
                         {student.status === GradingStatus.ERROR && <i className="fas fa-exclamation-circle text-red-500"></i>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Middle: Visualization Area */}
          <div className="col-span-12 lg:col-span-6 flex flex-col h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden relative">
              {selectedStudent ? (
                <>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm absolute w-full z-20">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <i className="fas fa-eye text-teal-500"></i>
                       {selectedStudent.name}
                    </h3>
                    {selectedStudent.status === GradingStatus.COMPLETED && (
                       <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                         {selectedStudent.result?.annotations.length} Annotations
                       </span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 overflow-auto pt-16">
                     {selectedStudent.status === GradingStatus.COMPLETED && selectedStudent.result ? (
                       <div className="flex flex-col gap-4 w-full h-full">
                          <AnnotationViewer 
                            imageUrl={selectedStudent.previewUrl} 
                            annotations={selectedStudent.result.annotations} 
                          />
                          {/* Student Transcription View */}
                          {selectedStudent.result.studentTranscription && (
                            <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
                              <span className="font-semibold block mb-1">OCR Transcription (Verify correctness):</span>
                              {selectedStudent.result.studentTranscription}
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="relative group max-w-full">
                         <img 
                           src={selectedStudent.previewUrl} 
                           className={`max-h-[600px] rounded-lg shadow-lg transition-opacity duration-500 ${selectedStudent.status === GradingStatus.PROCESSING ? 'opacity-50 blur-sm' : ''}`} 
                           alt="Preview" 
                         />
                         {selectedStudent.status === GradingStatus.PROCESSING && (
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center">
                                <i className="fas fa-circle-notch fa-spin text-3xl text-teal-500 mb-2"></i>
                                <span className="font-semibold text-gray-700">Thinking...</span>
                                <span className="text-xs text-gray-500">Analyzing logic flow & creating visual aid...</span>
                              </div>
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
                   <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                     <i className="fas fa-mouse-pointer text-3xl opacity-50"></i>
                   </div>
                   <p>Select a student to view details</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Analytics & Feedback */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* 1. Batch Analytics */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-chart-pie text-gray-400"></i> Batch Analytics
              </h2>
              <StatsChart data={distribution} />
            </div>

            {/* 2. Detailed Feedback */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex-1">
               <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                <i className="fas fa-comment-alt text-gray-400"></i> Feedback
              </h2>
              
              {selectedStudent?.status === GradingStatus.COMPLETED && selectedStudent.result ? (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* Score Card */}
                  <div className={`p-4 rounded-xl border-l-4 ${
                    selectedStudent.result.score >= 8 ? 'bg-green-50 border-green-500' :
                    selectedStudent.result.score >= 5 ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-red-500'
                  }`}>
                     <div className="flex justify-between items-end">
                       <div>
                         <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total Score</span>
                         <div className="text-3xl font-extrabold">{selectedStudent.result.score}<span className="text-lg text-gray-400 font-medium">/10</span></div>
                       </div>
                       <i className={`fas ${
                         selectedStudent.result.score >= 8 ? 'fa-star text-green-400' :
                         selectedStudent.result.score >= 5 ? 'fa-check-circle text-orange-400' : 'fa-exclamation-triangle text-red-400'
                       } text-3xl opacity-20`}></i>
                     </div>
                  </div>

                  {/* Generated Visual Aid */}
                  {selectedStudent.result.visualAidUrl && (
                    <div className="relative group">
                       <h3 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center gap-1">
                        <i className="fas fa-magic"></i> AI Visual Concept
                      </h3>
                      <div className="rounded-lg overflow-hidden border border-indigo-100 shadow-sm relative">
                        <img 
                          src={selectedStudent.result.visualAidUrl} 
                          alt="AI Concept" 
                          className="w-full h-auto object-cover"
                        />
                         <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-[10px] p-1 truncate">
                           {selectedStudent.result.conceptDescription}
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Text Feedback */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Analysis</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {selectedStudent.result.feedback}
                    </p>
                  </div>

                  {/* Strengths */}
                  {selectedStudent.result.strengths.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-green-600 uppercase mb-2 flex items-center gap-1">
                        <i className="fas fa-thumbs-up"></i> Strengths
                      </h3>
                      <ul className="text-sm space-y-1">
                        {selectedStudent.result.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 items-start text-gray-600">
                             <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                             <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {selectedStudent.result.weaknesses.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1">
                        <i className="fas fa-wrench"></i> Improvements
                      </h3>
                      <ul className="text-sm space-y-1">
                        {selectedStudent.result.weaknesses.map((w, i) => (
                          <li key={i} className="flex gap-2 items-start text-gray-600">
                             <i className="fas fa-arrow-right text-red-400 mt-1 text-xs"></i>
                             <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : selectedStudent?.status === GradingStatus.ERROR ? (
                <div className="text-center py-10 text-red-400">
                  <i className="fas fa-times-circle text-4xl mb-3"></i>
                  <p className="font-semibold">Grading Failed</p>
                  <p className="text-sm text-gray-500 mt-2">{selectedStudent.error}</p>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-clipboard-check text-4xl mb-3 opacity-30"></i>
                  <p className="text-sm">Select a graded student to see feedback</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;