import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

async function main() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  });
  
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Hello world',
    });
    console.log("Success:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
