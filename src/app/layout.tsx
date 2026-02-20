import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui";
import { AnnouncementProvider } from "@/components/LiveRegion";
import { ReactQueryProvider } from "@/lib/queryClient";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ClerkProviderWrapper } from "@/components/auth/ClerkProviderWrapper";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Bealer Agency - Task Management",
  description: "You're in good hands with our task management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BA Tasks",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0033A0" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className="font-sans antialiased"
      >
        <ClerkProviderWrapper>
          <ServiceWorkerRegistration />
          <OfflineIndicator />
          <ReactQueryProvider>
            <ThemeProvider>
              <AnnouncementProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </AnnouncementProvider>
            </ThemeProvider>
          </ReactQueryProvider>
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}
