
'use server';

/**
 * @fileOverview Implements the Genkit flow for detecting spam calls.
 *
 * - detectSpamCall - A function that handles spam call detection.
 * - DetectSpamCallInput - The input type for the detectSpamCall function.
 * - DetectSpamCallOutput - The return type for the detectSpamCall function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectSpamCallInputSchema = z.object({
  phoneNumber: z.string().describe('The incoming phone number to check.'),
});
export type DetectSpamCallInput = z.infer<typeof DetectSpamCallInputSchema>;

const DetectSpamCallOutputSchema = z.object({
  isSpam: z
    .boolean()
    .describe('Whether the phone number is classified as spam.'),
  reason: z
    .string()
    .optional()
    .describe('The reason for the spam classification.'),
});
export type DetectSpamCallOutput = z.infer<typeof DetectSpamCallOutputSchema>;

export async function detectSpamCall(
  input: DetectSpamCallInput
): Promise<DetectSpamCallOutput> {
  return detectSpamCallFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectSpamCallPrompt',
  input: {schema: DetectSpamCallInputSchema},
  output: {schema: DetectSpamCallOutputSchema},
  prompt: `You are an expert at detecting spam phone calls.
Analyze the following phone number: {{phoneNumber}}

- Determine if the number is likely to be a spam call.
- Consider common patterns for spam numbers (e.g., area codes known for spam, unusual formats).
- If it is spam, provide a brief reason for your classification (e.g., "Known robocaller number," "Unusual area code").
- If it is not spam, you do not need to provide a reason.
  `,
});

const detectSpamCallFlow = ai.defineFlow(
  {
    name: 'detectSpamCallFlow',
    inputSchema: DetectSpamCallInputSchema,
    outputSchema: DetectSpamCallOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
