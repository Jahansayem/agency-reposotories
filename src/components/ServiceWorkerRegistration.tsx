'use client';

import { useEffect } from 'react';
import { Workbox } from 'workbox-window';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 * Sprint 3 Issue #34: Service Worker Implementation
 *
 * Registers the service worker for PWA functionality
 * Handles updates, offline events, and service worker lifecycle
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const wb = new Workbox('/sw.js');

      // Event: Service worker installed
      wb.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          console.log('Service Worker updated. New content available.');
          // Show update notification to user
          if (confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        } else {
          console.log('Service Worker installed for the first time.');
        }
      });

      // Event: Service worker activated
      wb.addEventListener('activated', (event) => {
        if (!event.isUpdate) {
          console.log('Service Worker activated.');
        }
      });

      // Event: Service worker controlling the page
      wb.addEventListener('controlling', () => {
        console.log('Service Worker is now controlling the page.');
      });

      // Event: Service worker waiting to activate
      wb.addEventListener('waiting', () => {
        console.log('Service Worker is waiting to activate.');
        // Show update notification
        if (confirm('New version waiting. Activate now?')) {
          wb.messageSkipWaiting();
        }
      });

      // Listen for offline/online events with named handlers for cleanup
      const handleOnline = () => {
        console.log('App is online');
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('app-online'));
      };

      const handleOffline = () => {
        console.log('App is offline');
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('app-offline'));
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Store interval ID for cleanup
      let updateIntervalId: ReturnType<typeof setInterval> | undefined;

      // Register the service worker
      wb.register()
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for updates every hour
          updateIntervalId = setInterval(() => {
            registration?.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          logger.error('Service Worker registration failed', error as Error, { component: 'ServiceWorkerRegistration', action: 'register' });
        });

      // Cleanup function to clear interval and remove event listeners on unmount
      return () => {
        if (updateIntervalId) {
          clearInterval(updateIntervalId);
        }
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
