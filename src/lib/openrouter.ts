/**
 * OpenRouter API client for AI chat completions
 * Documentation: https://openrouter.ai/docs
 */

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenRouter API for chat completions
 * @param request - The chat completion request
 * @returns The generated text response
 * @throws Error if API call fails or response is invalid
 */
export async function callOpenRouter(
  request: OpenRouterRequest
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://wavezly.netlify.app',
      'X-Title': 'Wavezly Todo List - Daily Digest'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid OpenRouter response format');
  }

  return data.choices[0].message.content;
}
