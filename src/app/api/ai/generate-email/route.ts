import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Customer email generation endpoint
// Generates professional update emails for internal staff to send to customers

interface TaskSummary {
  text: string;
  status: 'todo' | 'in_progress' | 'done';
  subtasksCompleted: number;
  subtasksTotal: number;
  notes?: string;
  dueDate?: string;
}

interface EmailRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  tasks: TaskSummary[];
  tone: 'formal' | 'friendly' | 'brief';
  senderName: string;
  includeNextSteps: boolean;
}

const SYSTEM_PROMPT = `You are a professional assistant helping insurance agency staff write customer update emails.

Your job is to generate clear, professional emails that update customers on the status of their insurance-related tasks.

Guidelines:
- Be warm but professional - this is a small agency with personal relationships
- Focus on what's been ACCOMPLISHED and what's NEXT
- Never expose internal details (task IDs, systems, internal notes)
- Use the customer's name naturally (not every sentence)
- Keep it concise - 2-4 short paragraphs max
- Be specific about what was done without being overly technical
- End with clear next steps OR a reassurance that things are handled
- For insurance context: policies, claims, payments, quotes, renewals are common topics

Status meanings:
- "todo": Not started yet
- "in_progress": Currently being worked on
- "done": Completed

Do NOT:
- Use bullet points (write in natural paragraphs)
- Start with "I hope this email finds you well"
- Be overly formal or stiff
- Include placeholder text like [DATE] or [NAME]
- Mention the task management system`;

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();
    const { customerName, customerEmail, customerPhone, tasks, tone, senderName, includeNextSteps } = body;

    if (!customerName || !tasks || tasks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer name and at least one task are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build task summary for the prompt
    const taskSummary = tasks.map((t, i) => {
      const statusLabel = t.status === 'done' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Pending';
      const subtaskInfo = t.subtasksTotal > 0 ? ` (${t.subtasksCompleted}/${t.subtasksTotal} steps done)` : '';
      const dueInfo = t.dueDate ? ` - Due: ${t.dueDate}` : '';
      return `${i + 1}. ${t.text} - ${statusLabel}${subtaskInfo}${dueInfo}`;
    }).join('\n');

    // Calculate overall progress
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'todo').length;

    const toneInstructions = {
      formal: 'Use a formal, professional tone suitable for business correspondence.',
      friendly: 'Use a warm, friendly tone while remaining professional. This is a small agency with personal relationships.',
      brief: 'Keep it very short and to the point - just the essential update in 2-3 sentences max.',
    };

    const prompt = `Generate a customer update email with the following details:

Customer Name: ${customerName}
${customerEmail ? `Customer Email: ${customerEmail}` : ''}
${customerPhone ? `Customer Phone: ${customerPhone}` : ''}
Sender Name: ${senderName}
Agency: Bealer Agency

Task Summary (${completed} completed, ${inProgress} in progress, ${pending} pending):
${taskSummary}

Tone: ${toneInstructions[tone]}
${includeNextSteps ? 'Include specific next steps or what the customer can expect.' : 'Keep focus on status update only.'}

Generate a JSON response with:
{
  "subject": "Brief, specific email subject line",
  "body": "The email body (use \\n for line breaks between paragraphs)",
  "suggestedFollowUp": "Optional: when to follow up (e.g., 'in 2-3 days') or null"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse email response');
    }

    const emailData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      subject: emailData.subject,
      body: emailData.body,
      suggestedFollowUp: emailData.suggestedFollowUp || null,
    });

  } catch (error) {
    console.error('Email generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate email. Please try again.' },
      { status: 500 }
    );
  }
}
