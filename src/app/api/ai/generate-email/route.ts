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
  transcription?: string;
  attachments?: Array<{ file_name: string; file_type: string }>;
  completed?: boolean;
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

INSURANCE AGENT COMMUNICATION STYLE:
- Use industry-appropriate language (e.g., "policy", "coverage", "premium", "claim", "quote", "renewal", "deductible", "carrier")
- Be warm and personal - insurance agents build long-term relationships with clients
- Show proactive care: "I wanted to reach out", "I'm making sure", "I'm keeping an eye on"
- Use reassuring language when appropriate: "you're all set", "everything is in order", "we've got you covered"
- Reference specific actions taken: "I spoke with the carrier", "I reviewed your policy", "I submitted the paperwork"

CONTENT GUIDELINES:
- Focus on what's been ACCOMPLISHED and what's NEXT
- If voicemail transcriptions are provided, use them to understand customer concerns and reference them naturally
- If attachments are mentioned, acknowledge them (e.g., "I've reviewed the documents you sent")
- If subtasks show detailed progress, use that to demonstrate thoroughness
- For completed tasks, be clear about outcomes and next steps
- Never expose internal details (task IDs, systems, internal notes that aren't relevant)
- Keep it concise - 2-4 short paragraphs max
- Be specific about what was done without being overly technical

Status meanings:
- "todo": Not started yet (be honest but reassuring)
- "in_progress": Currently being worked on (show active progress)
- "done": Completed (celebrate the accomplishment)

Do NOT:
- Use bullet points (write in natural paragraphs)
- Start with "I hope this email finds you well"
- Be overly formal or stiff
- Include placeholder text like [DATE] or [NAME]
- Mention the task management system
- Make promises about timing without context

REVIEW FLAGS:
You must also identify potential issues that the agent should review before sending:
- Sensitive information that might be in notes/transcriptions (SSNs, account numbers, private health info)
- Promises about specific dates or timelines
- Statements about coverage or policy details that should be verified
- Any placeholder information that needs to be filled in
- Negative news that may need softer delivery
- Mentions of money, payments, or pricing that should be double-checked`;

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

    // Build detailed task summary for the prompt
    const taskSummary = tasks.map((t, i) => {
      const statusLabel = t.status === 'done' || t.completed ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Pending';
      const subtaskInfo = t.subtasksTotal > 0 ? ` (${t.subtasksCompleted}/${t.subtasksTotal} steps completed)` : '';
      const dueInfo = t.dueDate ? ` - Due: ${t.dueDate}` : '';
      const notesInfo = t.notes ? `\n   Notes: ${t.notes}` : '';
      const transcriptionInfo = t.transcription ? `\n   Voicemail: ${t.transcription}` : '';
      const attachmentInfo = t.attachments && t.attachments.length > 0
        ? `\n   Attachments: ${t.attachments.map(a => `${a.file_name} (${a.file_type})`).join(', ')}`
        : '';
      return `${i + 1}. ${t.text} - ${statusLabel}${subtaskInfo}${dueInfo}${notesInfo}${transcriptionInfo}${attachmentInfo}`;
    }).join('\n\n');

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

IMPORTANT: Review the task details carefully. If voicemail transcriptions are provided, use them to understand context and customer concerns. If attachments are mentioned, acknowledge them appropriately. Pay attention to subtask progress to show thoroughness.

Generate a JSON response with:
{
  "subject": "Brief, specific email subject line",
  "body": "The email body (use \\n for line breaks between paragraphs)",
  "suggestedFollowUp": "Optional: when to follow up (e.g., 'in 2-3 days') or null",
  "warnings": [
    {
      "type": "sensitive_info" | "date_promise" | "coverage_detail" | "pricing" | "negative_news" | "needs_verification",
      "message": "Brief description of what to review",
      "location": "Where in the email this appears (subject/body)"
    }
  ]
}

The warnings array should flag any items that need the agent's review before sending. Only include warnings if there are actual issues to review.`;

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
      warnings: emailData.warnings || [],
    });

  } catch (error) {
    console.error('Email generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate email. Please try again.' },
      { status: 500 }
    );
  }
}
