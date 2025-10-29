import { GoogleGenAI } from "@google/genai";

export const getMoonBlessing = async (languageCode: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      // Provide a fallback if the API key is not available in the environment
      console.warn("API_KEY not found, returning fallback blessing.");
      return "May the moon's gentle light bring peace and wonder to your night.";
    }
    
    // Get the full language name from the code for a clearer prompt
    const languageName = new Intl.DisplayNames([languageCode], { type: 'language' }).of(languageCode) || 'English';

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, poetic one-sentence blessing in ${languageName} for someone who has just found the moon in the sky.`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 50,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching moon blessing:", error);
    return "May the moon's gentle light bring peace and wonder to your night.";
  }
};