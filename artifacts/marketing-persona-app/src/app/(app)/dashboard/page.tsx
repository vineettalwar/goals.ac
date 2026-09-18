'use client';

import { useEffect, useState, useRef } from 'react';
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client';
import { fetchDashboardData } from '@/lib/dashboard/actions';
import { PageSkeleton } from '@/components/skeletons/page-skeleton';

// Simple client-side cache
const dashboardCache = new Map<string, { data: Awaited<ReturnType<typeof fetchDashboardData>>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type FetchState<T> = 
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown };

export function DashboardPageWithSuspense() {
  const [fetchState, setFetchState] = useState<FetchState<Awaited<ReturnType<typeof fetchDashboardData>>> | null>(null);
  const isMounted = useRef(false);

  // Initialize data fetching
  useEffect(() => {
    isMounted.current = true;
    
    // Check cache first
    const cacheKey = 'dashboard-data';
    const cached = dashboardCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Return cached data if still valid
      if (isMounted.current) {
        if (cached.data === null) {
          setFetchState({ status: 'success', data: null });
        } else {
          setFetchState({ status: 'success', data: cached.data });
        }
      }
      return;
    }
    
    // Fetch fresh data
    let cancelled = false;
    
    async function fetchData() {
      setFetchState({ status: 'loading' });
      try {
        const data = await fetchDashboardData();
        if (!cancelled && isMounted.current) {
          // Cache the result
          dashboardCache.set(cacheKey, { data, timestamp: now });
          
          if (data === null) {
            // User is not authenticated
            setFetchState({ status: 'success', data: null });
          } else {
            setFetchState({ status: 'success', data });
          }
        }
      } catch (error) {
        if (!cancelled && isMounted.current) {
          setFetchState({ status: 'error', error });
        }
      }
    }
    
    fetchData();
    
    return () => {
      cancelled = true;
      isMounted.current = false;
    };
  }, []);

  // Handle different states
  if (fetchState === null) {
    // Initial render - show skeleton
    return <PageSkeleton />;
  }

  if (fetchState.status === 'loading') {
    // Still loading - show skeleton
    return <PageSkeleton />;
  }

  if (fetchState.status === 'error') {
    // Error occurred - you might want to show an error message
    console.error('Failed to load dashboard data:', fetchState.error);
    return <PageSkeleton />;
  }

  // Success case - render the dashboard
  if (fetchState.status === 'success' && fetchState.data === null) {
    // User is not authenticated
    return null;
  }

  if (fetchState.status === 'success' && fetchState.data) {
    const { projects, activeProject, pieces, autopilotSettings, commandCenter, articleUsage } = fetchState.data;
    
    // These functions are moved from the original page component
    function dashboardGreeting(name?: string | null) {
      const hour = new Date().getHours();
      const time =
        hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const first = name?.trim().split(" ")[0];
      return first ? `${time}, ${first}` : time;
    }

    function dashboardSubtitle(
      activeProjectName: string | null,
      projectCount: number,
    ): string | null {
      if (activeProjectName) return activeProjectName;
      if (projectCount === 0) {
        return "Create a project to generate and publish content";
      }
      return null;
    }

    return (
      <DashboardPageClient
        greeting={dashboardGreeting(fetchState.data.activeProject?.name ?? null)}
        subtitle={dashboardSubtitle(fetchState.data.activeProject?.name ?? null, fetchState.data.projects.length)}
        projects={fetchState.data.projects}
        activeProject={fetchState.data.activeProject}
        pieces={fetchState.data.pieces}
        autopilotSettings={fetchState.data.autopilotSettings}
        commandCenter={fetchState.data.commandCenter}
        articleUsage={fetchState.data.articleUsage}
      />
    );
  }

  // Fallback - should not reach here
  return <PageSkeleton />;
}