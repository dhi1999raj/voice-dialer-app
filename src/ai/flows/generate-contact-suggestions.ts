
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
  contactToCall: z
    .string()
    .optional()
    .describe('The name of the single contact to call if an exact match is found.'),
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
  prompt: `You are a helpful assistant that finds a contact to call based on voice input.
The user said: "{{voiceInput}}"
Here is the list of available contacts: {{#each contactList}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}

Your task is to identify a single contact to call from the list.
- Find the best, case-insensitive match for the "{{voiceInput}}" from the provided contact list.
- If you find a single, unambiguous match, return that contact's name in the 'contactToCall' field.
- If the input is ambiguous or matches multiple contacts (e.g., "John"), do not return any name.
- If no likely match is found, do not return any name.
- ONLY return a name that is present in the contact list. Do not guess or create new names.
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

    