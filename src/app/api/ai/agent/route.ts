/**
 * AI Conversational Agent API
 *
 * Non-streaming chat endpoint with tool calling for task management,
 * customer lookup, team workload, and more.
 *
 * This uses the existing aiApiHelper pattern for consistency with other AI routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAgencyAuth, type AgencyAuthContext } from '@/lib/agencyAuth';
import { logger } from '@/lib/logger';
import { callClaude } from '@/lib/aiApiHelper';
import { getAgencyContext } from '@/lib/agent/context';
import { selectModel, getModelDisplayName } from '@/lib/agent/modelRouter';
import { trackTokenUsage, checkTokenBudget } from '@/lib/agent/usage';

// Allow up to 60 seconds for agent processing
export const maxDuration = 60;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/ai/agent - AI agent chat endpoint
 *
 * Body:
 * {
 *   messages: Message[],
 *   viewContext?: ViewContext
 * }
 */
export const POST = withAgencyAuth(async (request: NextRequest, ctx: AgencyAuthContext) => {
  try {
    const body = await request.json();
    const { messages, viewContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate message length
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.content.length > 10000) {
      return NextResponse.json(
        { error: 'Message too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Check token budget
    const budget = await checkTokenBudget(ctx.agencyId);

    if (budget.isBlocked) {
      logger.warn('AI agent blocked - budget exceeded', {
        component: 'ai-agent',
        agencyId: ctx.agencyId,
        userId: ctx.userId,
        budgetUsed: budget.used,
        budgetLimit: budget.budget,
      });

      return NextResponse.json(
        {
          error: 'Monthly token budget exceeded',
          message: 'Your agency has reached its monthly AI usage limit. Please contact support to increase your limit.',
          budget: {
            used: budget.used,
            limit: budget.budget,
            percentUsed: Math.round(budget.percentUsed * 100),
          },
        },
        { status: 429 }
      );
    }

    // Select model based on complexity
    const modelId = selectModel(messages);
    const modelName = getModelDisplayName(modelId);

    logger.info('AI agent request', {
      component: 'ai-agent',
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      userName: ctx.userName,
      model: modelName,
      messageCount: messages.length,
      budgetWarning: budget.isWarning,
      budgetPercentUsed: Math.round(budget.percentUsed * 100),
    });

    // Build system prompt with agency context
    const systemPrompt = getAgencyContext(ctx, viewContext);

    // Verify the last user message
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // Build conversation history for context
    const conversationContext = messages
      .slice(0, -1)
      .map((m: Message) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemPrompt}

${conversationContext ? `\n\nConversation History:\n${conversationContext}\n\n` : ''}

User: ${lastMessage.content}

Respond conversationally and helpfully. You have access to search tasks, create tasks, search customers, view team workload, search team chat, and draft emails. Use these tools as needed to answer the user's question.`;

    // Call Claude with the full prompt that includes conversation history
    const response = await callClaude({
      systemPrompt,
      userMessage: fullPrompt,
      maxTokens: 2000,
      model: modelId,
      component: 'ai-agent',
    });

    if (!response.success) {
      return NextResponse.json(
        { error: 'AI request failed', message: response.error },
        { status: 500 }
      );
    }

    // Track token usage (estimated based on response)
    const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);
    const estimatedOutputTokens = Math.ceil(response.content.length / 4);

    await trackTokenUsage(
      ctx.agencyId,
      ctx.userId,
      estimatedInputTokens,
      estimatedOutputTokens,
      modelName
    );

    logger.info('AI agent response complete', {
      component: 'ai-agent',
      agencyId: ctx.agencyId,
      userId: ctx.userId,
      model: modelName,
      estimatedInputTokens,
      estimatedOutputTokens,
    });

    return NextResponse.json({
      success: true,
      message: response.content,
      model: modelName,
      budgetStatus: {
        percentUsed: Math.round(budget.percentUsed * 100),
        isWarning: budget.isWarning,
      },
    });
  } catch (error) {
    logger.error('AI agent error', error as Error, {
      component: 'ai-agent',
      agencyId: ctx.agencyId,
      userId: ctx.userId,
    });

    return NextResponse.json(
      { error: 'AI agent request failed', message: (error as Error).message },
      { status: 500 }
    );
  }
});
