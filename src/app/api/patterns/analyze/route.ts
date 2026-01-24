import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callOpenRouter } from '@/lib/openrouter';

/**
 * POST /api/patterns/analyze
 *
 * Analyzes completed tasks from the last 90 days to identify patterns
 * and update the task_patterns table for smart suggestions.
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    // Fetch completed tasks from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: completedTasks, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', true)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fetchError) {
      console.error('Failed to fetch completed tasks:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    if (!completedTasks || completedTasks.length < 10) {
      return NextResponse.json({
        success: true,
        message: 'Not enough completed tasks to analyze',
        patternsFound: 0,
      });
    }

    // Use OpenRouter to analyze and categorize tasks
    const taskSummary = completedTasks
      .slice(0, 200) // Limit for context window
      .map(t => {
        const subtaskCount = t.subtasks?.length || 0;
        return `- ${t.text} (priority: ${t.priority}, subtasks: ${subtaskCount})`;
      })
      .join('\n');

    const responseText = await callOpenRouter({
      model: 'anthropic/claude-3.5-sonnet',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `Analyze these insurance agency tasks and identify common patterns.

Tasks:
${taskSummary}

Categorize into these insurance-specific categories:
- policy_review: Policy reviews, renewals, endorsements
- vehicle_add: Adding/removing vehicles
- new_client: New client onboarding
- claim: Claims processing
- payment: Payment issues, billing
- quote: Quote requests
- documentation: Document requests, certificates
- follow_up: General follow-ups
- other: Miscellaneous

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "patterns": [
    {
      "category": "category_name",
      "pattern_text": "normalized task description (short, general)",
      "occurrence_count": number,
      "avg_priority": "low|medium|high|urgent",
      "suggested_subtasks": ["subtask1", "subtask2", "subtask3"]
    }
  ]
}

Group similar tasks together and extract common subtask patterns. Only include patterns that appear at least 3 times.`,
        },
      ],
    });

    // Try to parse JSON from response
    let patterns;
    try {
      // Clean up response if it has markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        patterns = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI analysis' },
        { status: 500 }
      );
    }

    // Upsert patterns into database
    let upsertedCount = 0;
    for (const pattern of patterns.patterns || []) {
      const { error: upsertError } = await supabase
        .from('task_patterns')
        .upsert(
          {
            pattern_text: pattern.pattern_text,
            category: pattern.category,
            occurrence_count: pattern.occurrence_count,
            avg_priority: pattern.avg_priority,
            common_subtasks: pattern.suggested_subtasks,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'pattern_text',
          }
        );

      if (!upsertError) {
        upsertedCount++;
      } else {
        console.error('Failed to upsert pattern:', upsertError);
      }
    }

    return NextResponse.json({
      success: true,
      patternsFound: patterns.patterns?.length || 0,
      patternsUpserted: upsertedCount,
      tasksAnalyzed: completedTasks.length,
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
