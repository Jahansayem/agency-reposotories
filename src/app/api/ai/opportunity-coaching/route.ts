import { NextRequest } from 'next/server';
import {
  validateAiRequest,
  callClaude,
  aiErrorResponse,
  aiSuccessResponse,
  withAiErrorHandling,
  withSessionAuth,
} from '@/lib/aiApiHelper';

interface CoachingRequest {
  taskText: string;
  customerName: string;
  recommendedProduct: string;
  currentProducts: string;
  tenureYears: number;
  currentPremium: number;
  potentialPremiumAdd: number;
  talkingPoint1: string;
  talkingPoint2: string;
}

const SYSTEM_PROMPT =
  'You are a pre-call coach for an Allstate insurance agent. Be conversational and specific — not scripted or salesy. Insurance agents build long-term relationships; the tone should feel like advice from a colleague. Respond with plain text only — no JSON, no markdown, no bullet points.';

function buildUserPrompt(body: CoachingRequest): string {
  const {
    taskText,
    customerName,
    recommendedProduct,
    currentProducts,
    tenureYears,
    currentPremium,
    potentialPremiumAdd,
    talkingPoint1,
    talkingPoint2,
  } = body;

  return `The agent is about to: "${taskText}"

This customer (${customerName}) also has a cross-sell opportunity:
- Recommended product: ${recommendedProduct}
- Currently has: ${currentProducts} (${tenureYears} years, $${currentPremium}/yr)
- Potential add: +$${potentialPremiumAdd}/yr
- Talking points: "${talkingPoint1}" / "${talkingPoint2}"

Write 2–3 sentences:
1. Acknowledge the reason for the call
2. Suggest the natural moment to bring up the opportunity
3. Give one specific, natural opener line

Keep it under 60 words.`;
}

async function handleOpportunityCoaching(request: NextRequest) {
  const validation = await validateAiRequest(request, {
    customValidator: (body) => {
      const required: (keyof CoachingRequest)[] = [
        'taskText',
        'customerName',
        'recommendedProduct',
        'currentProducts',
        'talkingPoint1',
        'talkingPoint2',
      ];
      for (const field of required) {
        if (!body[field] || typeof body[field] !== 'string') {
          return `${field} is required`;
        }
      }
      if (body.tenureYears === undefined || body.tenureYears === null) {
        return 'tenureYears is required';
      }
      if (body.currentPremium === undefined || body.currentPremium === null) {
        return 'currentPremium is required';
      }
      if (body.potentialPremiumAdd === undefined || body.potentialPremiumAdd === null) {
        return 'potentialPremiumAdd is required';
      }
      return null;
    },
  });

  if (!validation.valid) {
    return validation.response;
  }

  const coachingBody = validation.body as unknown as CoachingRequest;
  const userPrompt = buildUserPrompt(coachingBody);

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: userPrompt,
    maxTokens: 150,
    component: 'OpportunityCoaching',
  });

  if (!result.success) {
    return aiErrorResponse('Coaching unavailable — use the talking points above', 503);
  }

  return aiSuccessResponse({ coaching: result.content.trim() });
}

export const POST = withAiErrorHandling(
  'OpportunityCoaching',
  withSessionAuth(async (request: NextRequest) => {
    return handleOpportunityCoaching(request);
  })
);
