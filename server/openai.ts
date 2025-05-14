import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SurveyQuestion {
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

/**
 * Generates survey questions based on a title and description
 */
export async function generateSurveyQuestions(
  title: string,
  description: string
): Promise<SurveyQuestion[]> {
  try {
    const prompt = `
Create a set of survey questions based on this title: "${title}" and description: "${description}".
Generate diverse question types appropriate for a survey about this topic.

Return your response as a JSON array with objects having these properties:
- "type": One of "short-text", "long-text", "multiple-choice", "checkbox", "dropdown", "rating", "date", "email"
- "label": The question text
- "required": Boolean indicating if the question is required (mix of true and false)
- "options": Array of string choices (only for multiple-choice, checkbox, dropdown types)

Create between 5-8 questions with a mix of different question types. Make the questions diverse, relevant, 
and professional. Ensure all "multiple-choice", "checkbox", and "dropdown" types have appropriate options arrays.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from API");
    }

    const parsedResponse = JSON.parse(content);
    return parsedResponse.questions || [];
  } catch (error) {
    console.error("Error generating survey questions:", error);
    throw new Error("Failed to generate survey questions. Please try again.");
  }
}