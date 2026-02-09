import { type ReactNode } from "react";
import { usePageAccess } from "@/hooks/use-page-access";

interface FeatureGuardProps {
  pageKey: string;
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * FeatureGuard - Conditionally renders children based on feature access permissions
 *
 * Usage:
 * <FeatureGuard pageKey="tickets" featureKey="create">
 *   <Button>Create Ticket</Button>
 * </FeatureGuard>
 *
 * By default, returns null if access is denied (hides the feature completely).
 * You can provide a fallback prop to show something else instead.
 */
export function FeatureGuard({ pageKey, featureKey, children, fallback = null }: FeatureGuardProps) {
  const { canAccessFeature, isLoading } = usePageAccess();

  // While loading, show children to avoid flicker
  if (isLoading) {
    return <>{children}</>;
  }

  // Check if user can access this feature
  if (!canAccessFeature(pageKey, featureKey)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
