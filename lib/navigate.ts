// Typed navigation helpers — centralizes the Href cast in one place,
// eliminating scattered `as any` casts on router.push/replace calls.

import { router, type Href } from 'expo-router';

type RouteParam = string | { pathname: string; params?: Record<string, string | string[]> };

export function navigate(route: RouteParam) {
  router.push(route as Href);
}

export function navigateReplace(route: RouteParam) {
  router.replace(route as Href);
}

export function navigateBack() {
  router.back();
}

export function canNavigateBack() {
  return router.canGoBack();
}
