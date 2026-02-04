import { NextRequest } from 'next/server';
import {
  validateAiRequest,
  callClaude,
  parseAiJsonResponse,
  aiErrorResponse,
  aiSuccessResponse,
  isAiConfigured,
  withAiErrorHandling,
} from '@/lib/aiApiHelper';
import { withSessionAuth } from '@/lib/agencyAuth';

// Email translation endpoint
// Translates existing emails from English to Spanish

interface TranslateRequest {
  subject: string;
  body: string;
  targetLanguage: 'spanish';
}

const TRANSLATION_SYSTEM_PROMPT = `Eres un traductor profesional especializado en comunicaciones de seguros.

Tu trabajo es traducir correos electrónicos de agentes de seguros del inglés al español, manteniendo:
- El tono profesional pero cálido
- La terminología de seguros apropiada
- El estilo natural y conversacional
- Los saltos de línea y formato

TERMINOLOGÍA CLAVE:
- policy → póliza
- coverage → cobertura
- premium → prima
- claim → reclamación
- quote → cotización
- renewal → renovación
- deductible → deducible
- carrier → aseguradora
- agent → agente

ESTILO:
- Mantén el mismo nivel de formalidad que el original
- Usa español latinoamericano neutral (no específico de un país)
- Mantén los nombres de personas, empresas y marcas sin traducir
- Traduce naturalmente, no palabra por palabra`;

function buildPrompt(subject: string, emailBody: string): string {
  return `Traduce el siguiente correo electrónico del inglés al español, manteniendo el tono y estilo profesional de un agente de seguros:

ASUNTO:
${subject}

CUERPO:
${emailBody}

Genera una respuesta JSON con:
{
  "subject": "El asunto traducido",
  "body": "El cuerpo traducido (mantén los \\n para saltos de línea)"
}`;
}

async function handleTranslateEmail(request: NextRequest) {
  // Validate request
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      if (!body.subject || !body.body || body.targetLanguage !== 'spanish') {
        return 'Subject, body, and target language (spanish) are required';
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  if (!isAiConfigured()) {
    return aiErrorResponse('API key not configured', 500);
  }

  const { subject, body: emailBody } = validation.body as unknown as TranslateRequest;

  // Build prompt and call Claude
  const prompt = buildPrompt(subject, emailBody);

  const aiResult = await callClaude({
    systemPrompt: TRANSLATION_SYSTEM_PROMPT,
    userMessage: prompt,
    maxTokens: 1024,
    component: 'TranslateEmailAPI',
  });

  if (!aiResult.success) {
    return aiErrorResponse('Failed to translate email. Please try again.', 500, aiResult.error);
  }

  // Parse JSON from response
  const translatedData = parseAiJsonResponse<{
    subject?: string;
    body?: string;
  }>(aiResult.content);

  if (!translatedData) {
    return aiErrorResponse('Could not parse translation response', 500);
  }

  return aiSuccessResponse({
    subject: translatedData.subject || '',
    body: translatedData.body || '',
  });
}

export const POST = withAiErrorHandling('TranslateEmailAPI', withSessionAuth(async (request) => {
  return handleTranslateEmail(request);
}));
