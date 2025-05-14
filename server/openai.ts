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

Return your response in this exact JSON format:
{
  "questions": [
    {
      "type": "short-text",
      "label": "Question text goes here",
      "required": true,
      "options": null
    },
    {
      "type": "multiple-choice",
      "label": "Multiple choice question here",
      "required": true,
      "options": ["Option 1", "Option 2", "Option 3"]
    }
  ]
}

For types, ONLY use: "short-text", "long-text", "multiple-choice", "checkbox", "dropdown", "rating", "date", or "email".
Include "options" arrays only for "multiple-choice", "checkbox", and "dropdown" types.

Create exactly 5 questions with a mix of different question types. Make the questions relevant to the survey topic.
The response MUST be a valid JSON object with a "questions" array containing the questions.
`;

    console.log("Calling OpenAI API with prompt:", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    console.log("Raw OpenAI response:", content);
    
    if (!content) {
      throw new Error("No content returned from API");
    }

    try {
      const parsedResponse = JSON.parse(content);
      console.log("Parsed response:", JSON.stringify(parsedResponse));
      
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions) || parsedResponse.questions.length === 0) {
        console.error("Invalid response format from OpenAI:", parsedResponse);
        return [
          {
            type: "short-text",
            label: "What's your opinion on this topic?",
            required: true
          },
          {
            type: "multiple-choice",
            label: "How would you rate your experience?",
            required: true,
            options: ["Excellent", "Good", "Average", "Poor"]
          }
        ];
      }
      
      return parsedResponse.questions;
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError, "Content:", content);
      throw new Error("Failed to parse AI-generated questions. Please try again.");
    }
  } catch (error) {
    console.error("Error generating survey questions:", error);
    throw new Error("Failed to generate survey questions. Please try again.");
  }
}