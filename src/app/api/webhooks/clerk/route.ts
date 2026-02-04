import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { linkClerkUser, updateUserFromClerk } from '@/lib/auth/linkClerkUser';

/**
 * Clerk Webhook Handler
 *
 * Handles user lifecycle events from Clerk:
 * - user.created: Create or link user in our database
 * - user.updated: Sync user profile changes
 * - user.deleted: Handle user deletion (optional)
 *
 * Required env var: CLERK_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  const eventType = evt.type;

  console.log(`[Clerk Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        await linkClerkUser({
          clerkUserId: id,
          email: primaryEmail,
          firstName: first_name,
          lastName: last_name,
        });

        console.log(`[Clerk Webhook] User created/linked: ${id}`);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses?.[0]?.email_address;

        await updateUserFromClerk(id, {
          clerkUserId: id,
          email: primaryEmail,
          firstName: first_name,
          lastName: last_name,
        });

        console.log(`[Clerk Webhook] User updated: ${id}`);
        break;
      }

      case 'user.deleted': {
        // Optionally handle user deletion
        // For now, we'll just log it - users remain in our DB for data integrity
        const { id } = evt.data;
        console.log(`[Clerk Webhook] User deleted in Clerk: ${id}`);
        // Note: We don't delete users from our DB to preserve task history
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`[Clerk Webhook] Error handling ${eventType}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
