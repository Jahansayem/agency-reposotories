import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { callOpenRouter } from '@/lib/openrouter';
import { extractJSON } from '@/lib/parseAIResponse';

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

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequest = await request.json();
    const { subject, body: emailBody, targetLanguage } = body;

    if (!subject || !emailBody || targetLanguage !== 'spanish') {
      return NextResponse.json(
        { success: false, error: 'Subject, body, and target language (spanish) are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `Traduce el siguiente correo electrónico del inglés al español, manteniendo el tono y estilo profesional de un agente de seguros:

ASUNTO:
${subject}

CUERPO:
${emailBody}

Genera una respuesta JSON con:
{
  "subject": "El asunto traducido",
  "body": "El cuerpo traducido (mantén los \\n para saltos de línea)"
}`;

    // Call OpenRouter API with GPT-4o
    const responseText = await callOpenRouter({
      model: 'openai/gpt-4o',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      plugins: [{ id: 'response-healing' }],
    });

    // Parse JSON from response using robust extraction
    const translatedData = extractJSON<{
      subject?: string;
      body?: string;
    }>(responseText);

    if (!translatedData || !translatedData.subject || !translatedData.body) {
      throw new Error('Could not parse translation response');
    }

    return NextResponse.json({
      success: true,
      subject: translatedData.subject,
      body: translatedData.body,
    });

  } catch (error) {
    logger.error('Translation error', error, { component: 'TranslateEmailAPI' });
    return NextResponse.json(
      { success: false, error: 'Failed to translate email. Please try again.' },
      { status: 500 }
    );
  }
}
