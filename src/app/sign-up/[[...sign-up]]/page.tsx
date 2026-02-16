'use client';

import { SignUp } from '@clerk/nextjs';
import { AUTH_CONFIG } from '@/lib/featureFlags';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  // If Clerk is not enabled, redirect to main app (PIN registration)
  if (!AUTH_CONFIG.clerkEnabled) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0033A0] to-[#002080] p-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Join Wavezly
        </h1>
        <p className="text-white/80">
          Create your account to get started
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl rounded-xl',
          },
        }}
      />

      {/* Sign In Link */}
      <div className="mt-6 text-center">
        <p className="text-white/70 text-sm">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="text-white underline hover:text-white/90"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-white/60 text-xs">
        <p>&copy; 2026 Wavezly. All rights reserved.</p>
        <p className="mt-1">You&apos;re in good hands.</p>
      </div>
    </div>
  );
}
