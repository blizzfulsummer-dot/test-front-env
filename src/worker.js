import { createTenant, deleteTenant, getTenant, listTenants, updateTenant } from './tenant.js';
import { getAuthUser, login, refreshToken, requestReset, resetPassword, signup, updatePassword, verifyJwt } from './auth.js';
import { createRateLimiter } from './lib/rateLimit.js';

const ALLOWED_ORIGINS = [
  'https://test-front-env.pages.dev',
  'https://my-other-site.pages.dev',
  'https://rental-management.ehexibit.com'
];

const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

function withCors(response, allowOrigin = '*') {
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

function getAllowOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return '*';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function shouldRateLimit(pathname) {
  return ['/api/signup', '/api/login', '/api/update_password', '/api/request_reset', '/api/reset_password'].includes(pathname);
}

export default {
  async fetch(request, env) {
    const allowOrigin = getAllowOrigin(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    const url = new URL(request.url);
    if (shouldRateLimit(url.pathname)) {
      const rateLimitKey = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'anonymous';
      const result = authRateLimiter(rateLimitKey);
      if (!result.ok) {
        return withCors(json({ error: 'Too many requests' }, 429), allowOrigin);
      }
    }

    try {
      if (url.pathname === '/api/signup' && request.method === 'POST') {
        return withCors(await signup(request, env), allowOrigin);
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return withCors(await login(request, env), allowOrigin);
      }

      if (url.pathname === '/api/update_password' && request.method === 'POST') {
        return withCors(await updatePassword(request, env), allowOrigin);
      }

      if (url.pathname === '/api/request_reset' && request.method === 'POST') {
        return withCors(await requestReset(request, env), allowOrigin);
      }

      if (url.pathname === '/api/reset_password' && request.method === 'POST') {
        return withCors(await resetPassword(request, env), allowOrigin);
      }

      if (url.pathname === '/api/refresh' && request.method === 'POST') {
        return withCors(await refreshToken(request, env), allowOrigin);
      }

      if (url.pathname === '/api/me' && request.method === 'GET') {
        return withCors(await verifyJwt(request, env), allowOrigin);
      }

      const authUser = await getAuthUser(request, env);
      if (authUser.error) return withCors(json({ error: authUser.error }, authUser.status || 401), allowOrigin);

      if (url.pathname === '/api/tenants' && request.method === 'POST') {
        return withCors(await createTenant(request, env, authUser.user), allowOrigin);
      }

      if (url.pathname === '/api/tenants' && request.method === 'GET') {
        return withCors(await listTenants(request, env, authUser.user), allowOrigin);
      }

      if (url.pathname.startsWith('/api/tenants/')) {
        const id = url.pathname.split('/').pop();

        if (request.method === 'GET') {
          return withCors(await getTenant(request, env, authUser.user, id), allowOrigin);
        }

        if (request.method === 'PUT') {
          return withCors(await updateTenant(request, env, authUser.user, id), allowOrigin);
        }

        if (request.method === 'DELETE') {
          return withCors(await deleteTenant(request, env, authUser.user, id), allowOrigin);
        }
      }

      return withCors(new Response('Rental Management Worker is running!', { status: 200 }), allowOrigin);
    } catch (error) {
      console.error(error);
      return withCors(json({ error: error.message }, 500), allowOrigin);
    }
  }
};


