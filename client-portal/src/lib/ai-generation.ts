import OpenAI from 'openai'

// Gedeelde AI-generatielogica voor de Admin AI Workbench (test- en eval-endpoints).
// Providerresolutie is bewust gelijk aan src/app/api/ai/funda-tekst/route.ts
// zodat er geen tweede, afwijkende provider-strategie ontstaat.

export interface AiGenerationResult {
  text: string
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
}

function getOpenAI(): OpenAI {
  if (process.env.GITHUB_TOKEN) {
    return new OpenAI({
      apiKey: process.env.GITHUB_TOKEN,
      baseURL: 'https://models.inference.ai.azure.com',
    })
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  throw new Error('Geen GITHUB_TOKEN of OPENAI_API_KEY geconfigureerd')
}

export function resolveProviderModel(): { provider: string; model: string } {
  return {
    provider: process.env.GITHUB_TOKEN ? 'github-models' : 'openai',
    model: 'gpt-4o',
  }
}

/** Voer een systeemprompt + testinvoer uit tegen het geconfigureerde AI-model. */
export async function runAiPrompt(params: {
  systemPrompt: string
  userInput: string
}): Promise<AiGenerationResult> {
  const openai = getOpenAI()
  const { provider, model } = resolveProviderModel()

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userInput },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  })

  return {
    text: completion.choices[0]?.message?.content ?? '',
    provider,
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
  }
}
