import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { extractAndValidateUserName } from '@/lib/apiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET - Fetch all templates (user's own + shared)
export async function GET(request: NextRequest) {
  try {
    // Validate user session
    const { userName, error: authError } = await extractAndValidateUserName(request);
    if (authError) return authError;
    if (!userName) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 });
    }

    // SECURITY: Use separate parameterized queries instead of string interpolation
    // in .or() filter to prevent Supabase filter injection
    const [ownResult, sharedResult] = await Promise.all([
      supabase
        .from('task_templates')
        .select('*')
        .eq('created_by', userName)
        .order('created_at', { ascending: false }),
      supabase
        .from('task_templates')
        .select('*')
        .eq('is_shared', true)
        .order('created_at', { ascending: false }),
    ]);

    if (ownResult.error) throw ownResult.error;
    if (sharedResult.error) throw sharedResult.error;

    // Merge and deduplicate (own templates take precedence)
    const allTemplates = [...(ownResult.data || [])];
    const ownIds = new Set(allTemplates.map(t => t.id));
    for (const t of sharedResult.data || []) {
      if (!ownIds.has(t.id)) allTemplates.push(t);
    }

    return NextResponse.json(allTemplates);
  } catch (error) {
    logger.error('Error fetching templates', error, { component: 'api/templates', action: 'GET' });
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    // Validate user session
    const { userName, error: authError } = await extractAndValidateUserName(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, description, default_priority, default_assigned_to, subtasks, is_shared } = body;
    // Use validated session userName as created_by instead of trusting client body
    const created_by = userName;

    if (!name || !created_by) {
      return NextResponse.json({ error: 'name and created_by are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        name,
        description: description || null,
        default_priority: default_priority || 'medium',
        default_assigned_to: default_assigned_to || null,
        subtasks: subtasks || [],
        created_by,
        is_shared: is_shared || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      action: 'template_created',
      user_name: created_by,
      details: { template_name: name, is_shared },
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error creating template', error, { component: 'api/templates', action: 'POST' });
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    // Validate user session
    const { userName, error: authError } = await extractAndValidateUserName(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!userName) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only allow deletion by the creator
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)
      .eq('created_by', userName);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting template', error, { component: 'api/templates', action: 'DELETE' });
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
