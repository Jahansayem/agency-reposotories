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
          logger.info('Service Worker updated. New content available.', { component: 'ServiceWorkerRegistration', action: 'installed' });
          // Show update notification to user
          if (confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        } else {
          logger.info('Service Worker installed for the first time.', { component: 'ServiceWorkerRegistration', action: 'installed' });
        }
      });

      // Event: Service worker activated
      wb.addEventListener('activated', (event) => {
        if (!event.isUpdate) {
          logger.debug('Service Worker activated', { component: 'ServiceWorkerRegistration', action: 'activated' });
        }
      });

      // Event: Service worker controlling the page
      wb.addEventListener('controlling', () => {
        logger.debug('Service Worker is now controlling the page', { component: 'ServiceWorkerRegistration', action: 'controlling' });
      });

      // Event: Service worker waiting to activate
      wb.addEventListener('waiting', () => {
        logger.debug('Service Worker is waiting to activate', { component: 'ServiceWorkerRegistration', action: 'waiting' });
        // Show update notification
        if (confirm('New version waiting. Activate now?')) {
          wb.messageSkipWaiting();
        }
      });

      // Listen for offline/online events with named handlers for cleanup
      const handleOnline = () => {
        logger.debug('App is online', { component: 'ServiceWorkerRegistration', action: 'online' });
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('app-online'));
      };

      const handleOffline = () => {
        logger.debug('App is offline', { component: 'ServiceWorkerRegistration', action: 'offline' });
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
          logger.info('Service Worker registered', { component: 'ServiceWorkerRegistration', action: 'register' });

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
