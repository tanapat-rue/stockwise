import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!ai) return "Gemini API Key not configured.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, catchy product description (max 2 sentences) for a product named "${name}" in the category "${category}". If the name sounds Thai, include a touch of Thai cultural charm.`,
    });
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description.";
  }
};

export const analyzeSales = async (salesData: string): Promise<string> => {
  if (!ai) return "Gemini API Key not configured.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these sales transactions and give 3 key insights for a small business owner. Keep it brief and encouraging. Data: ${salesData}`,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to analyze data.";
  }
};
