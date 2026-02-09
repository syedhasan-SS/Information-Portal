import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface PageAccessData {
  pages: Record<string, boolean>;
  features: Record<string, Record<string, boolean>>;
}

export function usePageAccess() {
  const { user } = useAuth();

  const { data: pageAccess, isLoading } = useQuery<PageAccessData>({
    queryKey: ['page-access', user?.id],
    queryFn: async () => {
      if (!user?.email) {
        return { pages: {}, features: {} };
      }

      const res = await fetch('/api/page-access/my-access', {
        headers: {
          'x-user-email': user.email,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        console.error('Failed to fetch page access:', res.status);
        return { pages: {}, features: {} };
      }

      return res.json();
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const canAccessPage = (pageKey: string): boolean => {
    // Default to true if not loaded yet or if no data
    if (!pageAccess) return true;
    return pageAccess.pages?.[pageKey] ?? true;
  };

  const canAccessFeature = (pageKey: string, featureKey: string): boolean => {
    // Default to true if not loaded yet or if no data
    if (!pageAccess) return true;
    return pageAccess.features?.[pageKey]?.[featureKey] ?? true;
  };

  const getAccessiblePages = (): string[] => {
    if (!pageAccess) return [];
    return Object.keys(pageAccess.pages || {}).filter(key => pageAccess.pages[key]);
  };

  const getAccessibleFeatures = (pageKey: string): string[] => {
    if (!pageAccess) return [];
    const pageFeatures = pageAccess.features?.[pageKey] || {};
    return Object.keys(pageFeatures).filter(key => pageFeatures[key]);
  };

  return {
    canAccessPage,
    canAccessFeature,
    getAccessiblePages,
    getAccessibleFeatures,
    pageAccess,
    isLoading,
  };
}
