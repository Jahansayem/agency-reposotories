/**
 * Utilities for safely extracting and parsing JSON from AI responses
 * Handles markdown code blocks, multiple JSON objects, and malformed responses
 */

/**
 * Safely extract and parse JSON from AI responses
 * Handles markdown code blocks, multiple JSON objects, and malformed responses
 * @param responseText - Raw text response from AI
 * @returns Parsed JSON object or null if parsing fails
 */
export function extractJSON<T>(responseText: string): T | null {
  // Remove markdown code blocks if present
  let cleaned = responseText
    .replace(/^```json\s*/gm, '')
    .replace(/^```\s*/gm, '')
    .trim();

  // Try multiple patterns to find valid JSON
  const patterns = [
    /\{[\s\S]*?\}(?=\s*$)/,  // JSON object at end of string
    /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/,  // Balanced braces
    /\{[\s\S]+?\}(?=\s*[^}])/,  // First complete JSON object
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return parsed as T;
      } catch {
        // Continue to next pattern
        continue;
      }
    }
  }

  return null;
}

/**
 * Parse AI response with fallback to original input
 * @param responseText - Raw text response from AI
 * @param fallback - Fallback value if parsing fails
 * @param validator - Optional validation function to verify parsed result
 * @returns Parsed result or fallback
 */
export function parseAIResponseWithFallback<T>(
  responseText: string,
  fallback: T,
  validator?: (parsed: unknown) => boolean
): T {
  const parsed = extractJSON<T>(responseText);

  if (!parsed) {
    return fallback;
  }

  // Optional validation
  if (validator && !validator(parsed)) {
    return fallback;
  }

  return parsed;
}

/**
 * Validate that parsed result has required properties
 * @param parsed - Parsed object to validate
 * @param requiredProps - Array of required property names
 * @returns True if all required properties exist
 */
export function hasRequiredProperties(
  parsed: unknown,
  requiredProps: string[]
): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  const obj = parsed as Record<string, unknown>;
  return requiredProps.every(prop => prop in obj && obj[prop] !== undefined);
}
