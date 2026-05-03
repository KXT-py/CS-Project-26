import { GoogleGenAI, Type } from "@google/genai";
import { Recommendation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRecommendations(interests: string, categoryPreference?: string): Promise<Recommendation[]> {
  const prompt = `Recommend 5 ${categoryPreference || 'items (books, podcasts, articles, hobbies, skills, or learning fields)'} based on these interests: ${interests}. 
  Provide a diverse mix if no specific category is preferred.
  For each recommendation, give:
  1. A title
  2. A detailed personalized description explaining WHY it fits the user
  3. The category (book, hobby, skill, learning-field, podcast, or article)
  4. A reference link or resource name.
  
  Format the response as a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { 
              type: Type.STRING, 
              enum: ["book", "hobby", "skill", "learning-field", "podcast", "article"] 
            },
            link: { type: Type.STRING },
            reference: { type: Type.STRING }
          },
          required: ["id", "title", "description", "category"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '[]');
    return data;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function getDetailedExploration(item: Recommendation): Promise<string> {
  const prompt = `Provide a deep dive exploration into "${item.title}" (${item.category}).
  The user wants to explore this field further.
  Include:
  1. Core concepts or themes
  2. Getting started guide (Step-by-step)
  3. 3 Advanced milestones
  4. Recommended related resources
  
  Format as Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "Failed to generate detailed exploration.";
}
