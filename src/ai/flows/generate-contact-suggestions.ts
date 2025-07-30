
'use server';

/**
 * @fileOverview Implements the Genkit flow for generating contact suggestions based on voice input.
 *
 * - generateContactSuggestions - A function that handles the contact suggestion generation.
 * - GenerateContactSuggestionsInput - The input type for the generateContactSuggestions function.
 * - GenerateContactSuggestionsOutput - The return type for the generateContactSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContactSuggestionsInputSchema = z.object({
  voiceInput: z.string().describe('The voice input from the user.'),
  contactList: z.array(z.string()).describe('The list of available contacts.'),
});
export type GenerateContactSuggestionsInput = z.infer<
  typeof GenerateContactSuggestionsInputSchema
>;

const GenerateContactSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggested contacts based on the voice input. Can be empty.'),
});
export type GenerateContactSuggestionsOutput = z.infer<
  typeof GenerateContactSuggestionsOutputSchema
>;

export async function generateContactSuggestions(
  input: GenerateContactSuggestionsInput
): Promise<GenerateContactSuggestionsOutput> {
  return generateContactSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContactSuggestionsPrompt',
  input: {schema: GenerateContactSuggestionsInputSchema},
  output: {schema: GenerateContactSuggestionsOutputSchema},
  prompt: `You are a helpful assistant designed to suggest contacts based on voice input.

  The user said: "{{voiceInput}}"
  Here is the list of available contacts: {{contactList}}
  
  Your task is to suggest a list of contacts that the user might be trying to call.
  - If the voice input exactly matches a contact in the contact list (case-insensitive), return only that contact.
  - Otherwise, suggest contacts that sound similar to the voice input, or that are likely matches given common nicknames.
  - If no likely matches are found in the contact list, return an empty array for the suggestions.
  - Do not include any contacts that are not in the provided contact list.
  `,
});

const generateContactSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateContactSuggestionsFlow',
    inputSchema: GenerateContactSuggestionsInputSchema,
    outputSchema: GenerateContactSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
