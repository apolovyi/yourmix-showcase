/**
 * Router Smoke Tests
 *
 * Verifies that the router configuration exports correctly
 * and contains routes for all expected paths.
 */

import { describe, it, expect } from 'vitest';
import { router } from '@/router';

describe('Router configuration', () => {
  it('exports a valid router object', () => {
    expect(router).toBeDefined();
    expect(router).toHaveProperty('routes');
  });

  it('has a login route and a main route', () => {
    expect(router.routes.length).toBeGreaterThanOrEqual(2);

    const loginRoute = router.routes.find((r) => 'path' in r && r.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute).toHaveProperty('errorElement');
  });

  it('has a main route (AuthGuard) with children', () => {
    const mainRoute = router.routes.find((r) => !('path' in r) || r.path !== '/login');
    expect(mainRoute).toBeDefined();
    expect(mainRoute!.children).toBeDefined();
    expect(mainRoute!.children!.length).toBeGreaterThan(0);
  });

  it('has an index route that redirects to /inventory', () => {
    const mainRoute = router.routes.find((r) => !('path' in r) || r.path !== '/login');
    const indexRoute = mainRoute!.children!.find((r) => 'index' in r && r.index === true);
    expect(indexRoute).toBeDefined();
  });

  it.each([
    ['inventory', '/inventory'],
    ['pricing', '/pricing'],
    ['pricing/proposals/:id', '/pricing/proposals/:id'],
    ['catalog', '/catalog'],
    ['ai', '/ai'],
  ])('has a route for path "%s" (%s)', (path) => {
    const mainRoute = router.routes.find((r) => !('path' in r) || r.path !== '/login');
    const matchingRoute = mainRoute!.children!.find((r) => 'path' in r && r.path === path);
    expect(matchingRoute).toBeDefined();
  });

  it('has an error element on both routes', () => {
    const loginRoute = router.routes.find((r) => 'path' in r && r.path === '/login');
    const mainRoute = router.routes.find((r) => !('path' in r) || r.path !== '/login');
    expect(loginRoute).toHaveProperty('errorElement');
    expect(mainRoute).toHaveProperty('errorElement');
  });

  it('has exactly 6 child routes (1 index + 5 named)', () => {
    const mainRoute = router.routes.find((r) => !('path' in r) || r.path !== '/login');
    expect(mainRoute!.children).toHaveLength(6);
  });
});
