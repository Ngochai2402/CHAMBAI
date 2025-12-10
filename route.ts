import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { GradingResult } from '@/types';

// Initialize GenAI
// Note: In production, ensure process.env.GEMINI_API_KEY is set
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Prepare the base64 string (remove the prefix data:image/jpeg;base64,)
    const base64Data = image.split(',')[1];
    
    // Detailed System Instruction for the "Math Teacher" persona
    const systemInstruction = `
      You are an expert Math Teacher AI. Your task is to grade a handwritten math worksheet.
      
      1.  **Analyze**: Scan the image from top to bottom. Identify every distinct math expression or step.
      2.  **Evaluate**: For each line/step, determine if the math is logically correct based on the previous lines or standard math rules.
      3.  **Localize**: Return the 2D bounding box for each distinct line in the [ymin, xmin, ymax, xmax] format (0-1000 scale).
      4.  **Explain**: If a line is incorrect, provide a brief, friendly explanation of the error. If correct, keep explanation empty or "Correct".
      5.  **Transcription**: Transcribe the math into LaTeX format.

      **CRITICAL OUTPUT RULES:**
      - Return ONLY a valid JSON Array.
      - Do not include Markdown formatting (no \`\`\`json).
      - Do not include any intro/outro text.
    `;

    // Define the schema using the strongly typed system from the SDK
    const gradingSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          lineNumber: { type: Type.INTEGER, description: "The sequential line number starting from 1" },
          latex: { type: Type.STRING, description: "The math expression in LaTeX format" },
          isCorrect: { type: Type.BOOLEAN, description: "True if the step is mathematically valid" },
          explanation: { type: Type.STRING, description: "Feedback on the step" },
          boundingBox: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Coordinates [ymin, xmin, ymax, xmax] on a 1000x1000 scale",
          },
        },
        required: ["lineNumber", "latex", "isCorrect", "explanation", "boundingBox"],
      },
    };

    // Call the model
    // Using gemini-1.5-flash for speed/cost, but gemini-1.5-pro is better for complex handwriting.
    // If you need higher accuracy, switch model to 'gemini-1.5-pro'.
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Using the latest flash experimental for best vision capability/speed mix
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: "Grade this math problem. Identify lines, check correctness, and provide bounding boxes.",
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: gradingSchema,
        temperature: 0.1, // Low temperature for deterministic grading
      },
    });

    const outputText = response.text;
    
    // Parse the JSON (handling potential cleanup if model ignores 'pure json' constraint, though Schema mode helps)
    let results: GradingResult[] = [];
    try {
      const cleanJson = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      results = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", outputText);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
