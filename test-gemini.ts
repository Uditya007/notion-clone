import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

async function testModel(modelId: string) {
  console.log(`Testing model: ${modelId}...`);
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  });
  
  try {
    const { text } = await generateText({
      model: google(modelId),
      prompt: 'Hello world. Respond with "Hello" only.',
    });
    console.log(`  Success [${modelId}]: ${text.trim()}`);
  } catch (e: any) {
    console.error(`  Failure [${modelId}]:`, e.message || e);
  }
}

async function main() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-2.5-pro');
  await testModel('gemini-flash-latest');
  await testModel('gemini-pro-latest');
}
main();
