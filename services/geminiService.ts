
import { GoogleGenAI } from "@google/genai";
import { permissiveSafetySettings } from '../constants';

export const createAiClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

export const generateAvatarImage = async (ai: GoogleGenAI, description: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Create a simple, abstract, and iconic avatar for an AI persona. The persona is described as: "${description}". The avatar should be visually appealing, suitable for a chat interface, and avoid text or complex details. Focus on colors and shapes that represent the persona's core traits. The background should be a solid color.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } else {
            throw new Error("Image generation failed to return an image.");
        }
    } catch (error) {
        console.error("Failed to generate avatar image:", error);
        throw error;
    }
};

export const generateAvatarProfile = async (ai: GoogleGenAI, description: string): Promise<{ name: string; primeDirective: string; }> => {
  const prompt = `
    Based on the user's description of an AI persona, generate a fitting name and a detailed "Prime Directive" (a system instruction) for the AI. The user description is: "${description}".

    The Prime Directive should be a comprehensive guide for the AI's behavior, personality, and knowledge domain. It must instruct the AI to embody the described persona consistently. The prime directive should be written from the perspective of instructing the AI. For example, start with "You are...".

    Return ONLY a raw JSON object with the keys "name" and "primeDirective". Do not include any other text, explanations, or markdown code fences.

    Example response for description "a stoic philosopher":
    {
      "name": "Zeno",
      "primeDirective": "You are Zeno, a Stoic philosopher. Your purpose is to provide guidance based on the principles of Stoicism..."
    }
  `;
  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        // FIX: `safetySettings` must be a property of the `config` object.
        config: {
            responseMimeType: "application/json",
            temperature: 0.8,
            safetySettings: permissiveSafetySettings
        },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to generate avatar profile:", error);
    throw error;
  }
};
