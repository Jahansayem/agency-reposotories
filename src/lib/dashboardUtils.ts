/**
 * Dashboard utility functions for managing daily dashboard state.
 * These are extracted from DashboardModal to allow the component to be lazy loaded
 * while keeping the utility functions available synchronously.
 */

const DAILY_VISIT_KEY = 'bealer-last-dashboard-visit';

/**
 * Check if the daily dashboard should be shown.
 * Returns true if it's the first visit of the day.
 */
export function shouldShowDailyDashboard(): boolean {
  if (typeof window === 'undefined') return false;

  const lastVisit = localStorage.getItem(DAILY_VISIT_KEY);
  if (!lastVisit) return true;

  const lastVisitDate = new Date(lastVisit);
  const today = new Date();

  // Check if it's a different day
  return lastVisitDate.toDateString() !== today.toDateString();
}

/**
 * Mark the daily dashboard as shown for today.
 * Should be called when opening the dashboard to prevent re-showing.
 */
export function markDailyDashboardShown(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAILY_VISIT_KEY, new Date().toISOString());
}
