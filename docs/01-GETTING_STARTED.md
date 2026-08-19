# Getting Started

## Quick Start Guide

This guide will help you set up and run the Rental Management API locally.

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher
- **Cloudflare Account** (for production deployment)
- **Git** (for version control)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/blizzfulsummer-dot/rental-management-api.git
   cd rental-management-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the existing `wrangler.jsonc` and configure your Cloudflare settings:
   - Set your JWT secret in Cloudflare Secrets Manager: `JWT_SCRT`
   - Configure D1 database binding (database_id)
   - Update allowed CORS origins if needed

4. **Run database migrations**

   When you have a D1 database configured:
   ```bash
   npm run dev
   ```
   This will apply migrations from the `migrations/` folder.

### Development Workflow

#### Start local development server
```bash
npm run dev
```
The API will be available at `http://localhost:8787`

#### Build the project
```bash
npm run build
```
Output: `dist/worker.js` (bundled worker code)

#### Run tests
```bash
npm test
```
Runs all test files matching `*.test.js`

#### Deploy to production
```bash
npm run deploy
```
Deploys to your Cloudflare Workers account.

### Project Structure

```
rental-management-api/
├── src/
│   ├── worker.js           # Main entry point and request router
│   ├── auth.js             # Authentication endpoints
│   ├── tenant.js           # Tenant CRUD operations
│   └── lib/
│       ├── crypto.js       # Cryptographic utilities
│       ├── validation.js   # Input validation and sanitization
│       └── rateLimit.js    # Rate limiting middleware
├── migrations/
│   └── 0001_initial.sql    # Database schema
├── tests/
│   └── validation.test.js  # Test suite
├── docs/                   # Documentation (this folder)
├── dist/                   # Built output
├── backup/                 # Original code backup
├── package.json
├── wrangler.jsonc          # Cloudflare Workers configuration
└── README.md
```

### Common Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm test` | Run test suite |
| `npm run deploy` | Deploy to Cloudflare Workers |

### Troubleshooting

**Issue: "JWT_SCRT not found" error**
- Solution: Add JWT_SCRT to Cloudflare Secrets Manager
- Command: `wrangler secret put JWT_SCRT`

**Issue: Database migrations not running**
- Solution: Ensure D1 database is configured in `wrangler.jsonc`
- Check database_id is correct

**Issue: CORS errors in frontend**
- Solution: Add your frontend URL to `ALLOWED_ORIGINS` in `src/worker.js`

### Next Steps

- Review [API Documentation](02-API.md) for endpoint details
- Check [Architecture Overview](03-ARCHITECTURE.md) for project design
- See [Security Guide](04-SECURITY.md) for best practices
- Follow [Deployment Guide](05-DEPLOYMENT.md) for production setup
