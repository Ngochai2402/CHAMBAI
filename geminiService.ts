import { GoogleGenAI, Schema, Type } from "@google/genai";
import { GradingResult, Annotation } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the response schema for structured output
const annotationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["correct", "error", "warning", "info"] },
    x: { type: Type.NUMBER, description: "X coordinate (0-1). SHOULD BE > 0.85 (right margin) to strictly avoid covering text." },
    y: { type: Type.NUMBER, description: "Y coordinate (0-1) relative to image height" },
    width: { type: Type.NUMBER, description: "Width (0-1) for bounding box, optional" },
    height: { type: Type.NUMBER, description: "Height (0-1) for bounding box, optional" },
    text: { type: Type.STRING, description: "Short comment for the annotation" }
  },
  required: ["type", "x", "y"]
};

const gradingResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "The score given to the student" },
    maxScore: { type: Type.NUMBER, description: "The maximum possible score (usually 10)" },
    studentTranscription: { type: Type.STRING, description: "Transcription of the student's math work to verify OCR accuracy" },
    feedback: { type: Type.STRING, description: "Detailed feedback paragraph explaining the logic flow" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strengths" },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of weaknesses/errors" },
    conceptDescription: { type: Type.STRING, description: "A simple visual description of the mathematical concept or a diagram that would help explain the correct solution (e.g. 'A parabola opening upwards', 'A right triangle with sides 3,4,5'). Used for Image Generation." },
    annotations: { 
      type: Type.ARRAY, 
      items: annotationSchema, 
      description: "List of visual annotations to place on the image" 
    }
  },
  required: ["score", "maxScore", "feedback", "annotations", "studentTranscription"]
};

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const gradeSubmission = async (
  studentFile: File,
  answerKeyFile: File | null,
  context: string = "Grade this math problem."
): Promise<GradingResult> => {
  try {
    const studentBase64 = await fileToGenerativePart(studentFile);
    
    const parts: any[] = [
      {
        inlineData: {
          mimeType: studentFile.type,
          data: studentBase64
        }
      }
    ];

    let promptText = `
      You are an expert Math Olympiad Grader. Your goal is to grade the student's work with extreme precision and fairness.
      
      Task:
      1. **Transcribe**: First, carefully read and transcribe the student's handwriting into LaTeX/Text to ensure you see the numbers correctly.
      2. **Solve Independently**: Solve the problem yourself step-by-step to establish the ground truth.
      3. **Holistic Review**: Compare your solution with the student's. Look at the *entire flow* of logic, not just the final answer. 
         - Did they use the correct formula? 
         - Did they make a calculation error but keep the logic correct? (Partial credit).
         - Is the notation correct?
      4. **Visual Concept**: Create a text description for a diagram or illustration that represents the core concept of this problem (e.g., "A diagram of a cylinder with volume formula V=πr²h").
      5. **Annotate**: Generate precise X,Y coordinates (0-1) for:
         - **CRITICAL**: Place all annotation markers (checks, crosses) at the **END of the line** (right side, e.g., x > 0.85) so they **DO NOT OBSCURE** the student's writing.
         - Green Check: Correct major steps.
         - Red Cross: Logic or calculation errors.
         - Orange Warning: Missing units, bad notation, or skipped steps.
      
      Context/Instructions: ${context}
    `;

    if (answerKeyFile) {
      const answerKeyBase64 = await fileToGenerativePart(answerKeyFile);
      parts.push({
        inlineData: {
          mimeType: answerKeyFile.type,
          data: answerKeyBase64
        }
      });
      promptText += "\n\nThe second image provided is the ANSWER KEY. Use it as the definitive ground truth.";
    }

    parts.push({ text: promptText });

    // Using gemini-2.5-flash for better reasoning capabilities
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: gradingResponseSchema,
        temperature: 0.1, // Very low temperature for strict grading
        // Enable thinking to improve mathematical accuracy
        thinkingConfig: {
          thinkingBudget: 1024
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from Gemini");

    return JSON.parse(resultText) as GradingResult;

  } catch (error) {
    console.error("Grading error:", error);
    throw new Error("Failed to grade submission. Please check API Key or file format.");
  }
};

export const generateVisualAid = async (description: string): Promise<string | null> => {
  if (!description) return null;
  
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001', // Using Imagen 3 or 4 for high quality concept art
      prompt: `A clean, educational mathematical diagram or illustration suitable for a textbook. Concept: ${description}. White background, clear lines, high contrast.`,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg'
      }
    });

    const base64Data = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64Data) {
      return `data:image/jpeg;base64,${base64Data}`;
    }
    return null;
  } catch (error) {
    console.warn("Visual aid generation failed:", error);
    return null; // Fail gracefully, grading is more important
  }
};