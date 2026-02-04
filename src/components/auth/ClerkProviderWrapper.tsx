'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { AUTH_CONFIG } from '@/lib/featureFlags';

interface ClerkProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Conditional ClerkProvider wrapper
 *
 * Only wraps children with ClerkProvider if Clerk is enabled and configured.
 * This allows the app to run in PIN-only mode without Clerk keys.
 */
export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  // If Clerk is not enabled, just render children directly
  if (!AUTH_CONFIG.clerkEnabled) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#0033A0', // Allstate brand blue
          colorBackground: 'var(--background)',
          colorText: 'var(--foreground)',
          colorInputBackground: 'var(--input)',
          colorInputText: 'var(--foreground)',
          borderRadius: '0.5rem',
        },
        elements: {
          formButtonPrimary:
            'bg-[#0033A0] hover:bg-[#002080] text-white font-medium',
          card: 'shadow-lg',
          headerTitle: 'text-[var(--foreground)]',
          headerSubtitle: 'text-[var(--muted-foreground)]',
          socialButtonsBlockButton:
            'border border-[var(--border)] hover:bg-[var(--accent)]',
          formFieldLabel: 'text-[var(--foreground)]',
          formFieldInput:
            'border-[var(--border)] bg-[var(--input)] text-[var(--foreground)]',
          footerActionLink: 'text-[#0033A0] hover:text-[#002080]',
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
