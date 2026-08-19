import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../config/logger';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.llm.apiKey,
      baseURL: env.llm.baseUrl,
      timeout: env.llm.timeoutMs,
    });
  }
  return openaiClient;
}

// ─── Pre-Visit Summary ────────────────────────────────────────────────────────

export interface PreVisitSummary {
  urgency_level: 'Low' | 'Medium' | 'High' | 'Unknown';
  chief_complaint: string;
  suggested_questions: string[];
}

/**
 * SPEC §5.3 & §7 — Pre-visit symptom analysis.
 * Uses the EXACT prompt from the spec.
 * Hard timeout: env.llm.timeoutMs (default 10s).
 * On failure: returns Unknown urgency, does NOT block booking.
 */
export async function generatePreVisitSummary(symptoms: string): Promise<{
  summary: PreVisitSummary;
  aiGenerated: boolean;
}> {
  // SPEC §7 exact prompt — do not alter wording
  const userPrompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`;

  const systemPrompt = `You are a clinical triage assistant. Respond ONLY with valid JSON matching this schema exactly:
{
  "urgency_level": "Low" | "Medium" | "High",
  "chief_complaint": "string",
  "suggested_questions": ["string", "string", "string"]
}
No markdown, no explanation, only the JSON object.`;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: env.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');

    const parsed = JSON.parse(content) as PreVisitSummary;

    // Validate required fields
    if (!['Low', 'Medium', 'High'].includes(parsed.urgency_level)) {
      throw new Error(`Invalid urgency_level: ${parsed.urgency_level}`);
    }
    if (!parsed.chief_complaint || !Array.isArray(parsed.suggested_questions)) {
      throw new Error('Invalid response structure');
    }

    return { summary: parsed, aiGenerated: true };
  } catch (err) {
    // SPEC §5.3: LLM failure must NOT block booking
    logger.error(`Pre-visit LLM failure: ${err}`);
    return {
      summary: {
        urgency_level: 'Unknown',
        chief_complaint: symptoms.slice(0, 200),
        suggested_questions: [],
      },
      aiGenerated: false,
    };
  }
}

// ─── Post-Visit Summary ───────────────────────────────────────────────────────

/**
 * SPEC §5.4 & §7 — Post-visit clinical notes → patient-friendly summary.
 * Uses the EXACT prompt from the spec.
 * On failure: returns raw notes with ai_generated = false.
 */
export async function generatePostVisitSummary(notes: string): Promise<{
  summary: string;
  aiGenerated: boolean;
}> {
  // SPEC §7 exact prompt — do not alter wording
  const userPrompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}`;

  const systemPrompt = `You are a medical communication specialist. Convert clinical notes into clear, compassionate patient-friendly summaries. Respond ONLY with valid JSON matching this schema:
{
  "summary": "patient friendly plain text summary",
  "medication_schedule": [{"medication": "name", "dosage": "amount", "frequency": "schedule", "duration": "period"}],
  "follow_up_steps": ["step 1", "step 2"]
}
No markdown, no explanation, only the JSON object.`;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: env.llm.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');

    const parsed = JSON.parse(content);
    if (!parsed.summary) throw new Error('Missing summary field');

    return { summary: JSON.stringify(parsed), aiGenerated: true };
  } catch (err) {
    // SPEC §5.4: on failure, store doctor's raw notes as the "summary"
    logger.error(`Post-visit LLM failure: ${err}`);
    return {
      summary: notes,
      aiGenerated: false,
    };
  }
}
