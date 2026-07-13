# Rental Management

A small Cloudflare Workers API for rental management with authentication, tenant records, and D1 storage.

## What changed
- Added request validation for signup, login, password reset, and tenant payloads.
- Added lightweight rate limiting for auth endpoints.
- Added a backup of the original implementation in the backup/original-20260711 folder.
- Added a test suite and CI workflow.
- Added D1 migration support for repeatable schema setup.

## Development
1. Install dependencies: npm install
2. Run tests: npm test
3. Build the worker: npm run build
4. Start locally: npm run dev

## Database migrations
Run migrations with Wrangler when your D1 database is configured:

npm run dev

## Notes
- Keep your JWT secret in the Cloudflare secrets store as JWT_SCRT.
- The worker expects a D1 binding named DB.
