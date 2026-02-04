import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for user management
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Allstate brand colors for user assignment
const USER_COLORS = [
  '#0033A0', // Brand Blue
  '#72B5E8', // Sky Blue
  '#C9A227', // Gold
  '#003D7A', // Navy
  '#6E8AA7', // Muted Blue
  '#5BA8A0', // Teal
  '#E87722', // Orange
  '#98579B', // Purple
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

interface ClerkUserData {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface LinkedUser {
  id: string;
  name: string;
  email?: string;
  clerk_id: string;
  color: string;
}

/**
 * Link a Clerk user to an existing database user or create a new one
 *
 * @param clerkData - User data from Clerk
 * @returns The linked or created user
 */
export async function linkClerkUser(clerkData: ClerkUserData): Promise<LinkedUser> {
  const { clerkUserId, email, firstName, lastName } = clerkData;

  // First, check if this Clerk user is already linked
  const { data: existingClerkUser } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (existingClerkUser) {
    // User already linked, return them
    return existingClerkUser as LinkedUser;
  }

  // Check if there's an existing user with this email
  if (email) {
    const { data: existingEmailUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingEmailUser) {
      // Link the existing user to Clerk
      const { data: linkedUser, error } = await supabase
        .from('users')
        .update({ clerk_id: clerkUserId })
        .eq('id', existingEmailUser.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to link existing user to Clerk:', error);
        throw new Error('Failed to link user account');
      }

      return linkedUser as LinkedUser;
    }
  }

  // Create a new user
  const displayName = firstName
    ? `${firstName}${lastName ? ` ${lastName.charAt(0)}.` : ''}`
    : email?.split('@')[0] || 'User';

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name: displayName,
      email: email || null,
      clerk_id: clerkUserId,
      color: getRandomColor(),
      // PIN hash is null for Clerk-only users
      pin_hash: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create user for Clerk:', error);
    throw new Error('Failed to create user account');
  }

  return newUser as LinkedUser;
}

/**
 * Get a user by their Clerk ID
 */
export async function getUserByClerkId(clerkUserId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (error) {
    console.error('Failed to get user by Clerk ID:', error);
    return null;
  }

  return data;
}

/**
 * Update a user's Clerk data (e.g., when they update their profile in Clerk)
 */
export async function updateUserFromClerk(clerkUserId: string, updates: Partial<ClerkUserData>) {
  const { email, firstName, lastName } = updates;

  const updateData: Record<string, unknown> = {};

  if (email !== undefined) {
    updateData.email = email;
  }

  if (firstName !== undefined || lastName !== undefined) {
    const displayName = firstName
      ? `${firstName}${lastName ? ` ${lastName.charAt(0)}.` : ''}`
      : undefined;
    if (displayName) {
      updateData.name = displayName;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return; // Nothing to update
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('clerk_id', clerkUserId);

  if (error) {
    console.error('Failed to update user from Clerk:', error);
    throw new Error('Failed to update user');
  }
}
