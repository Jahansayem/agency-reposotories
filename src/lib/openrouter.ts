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
  plugins?: Array<{ id: string }>;
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
  };
}

interface OpenRouterError {
  code: number | string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface OpenRouterResponse {
  id?: string;
  choices?: {
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
    native_finish_reason?: string;
    thinking_process?: string;
  }[];
  error?: OpenRouterError;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    thinking_tokens?: number;
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
      'X-Title': 'Wavezly Todo List - AI Features'
    },
    body: JSON.stringify(request)
  });

  // Parse response body (could be error or success)
  let data: OpenRouterResponse;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error(`OpenRouter response parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  // Check for HTTP-level errors (400, 401, 429, 500, etc.)
  if (!response.ok) {
    const errorMsg = data.error?.message || 'Unknown error';
    const errorCode = data.error?.code || response.status;
    throw new Error(`OpenRouter API error (${errorCode}): ${errorMsg}`);
  }

  // Check for mid-stream errors (response.ok but contains error field)
  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message} (code: ${data.error.code})`);
  }

  // Check finish_reason for error conditions
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === 'error') {
    const nativeReason = data.choices?.[0]?.native_finish_reason || 'unknown';
    throw new Error(`OpenRouter generation error: ${nativeReason}`);
  }

  // Validate response structure
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter response missing content');
  }

  // Optional: Log thinking process if available (useful for debugging)
  const thinkingProcess = data.choices?.[0]?.thinking_process;
  if (thinkingProcess && process.env.NODE_ENV === 'development') {
    console.log('[OpenRouter Thinking Process]', thinkingProcess);
  }

  return content;
}
