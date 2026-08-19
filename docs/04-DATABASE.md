# Database Schema Documentation

## Overview

The Rental Management API uses **D1** (Cloudflare's SQLite database) to store all application data. The schema is defined in `migrations/0001_initial.sql` and is automatically applied when running the development server.

## Database Tables

### users

Stores user account information including authentication credentials.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  name TEXT,
  requires_change_password INTEGER DEFAULT 0,
  temp_password_expiration TEXT
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| email | TEXT | UNIQUE, NOT NULL | User's email address |
| password_hash | TEXT | NOT NULL | PBKDF2-SHA256 hash (hex-encoded) |
| password_salt | TEXT | NOT NULL | Random salt used in hash (hex-encoded) |
| role | TEXT | NOT NULL | User role: `admin`, `tenant`, or `user` |
| created_at | TEXT | NOT NULL | ISO 8601 timestamp of account creation |
| name | TEXT | NULL | User's full name |
| requires_change_password | INTEGER | DEFAULT 0 | Flag: 1 if user must change password on login |
| temp_password_expiration | TEXT | NULL | ISO 8601 timestamp when temp password expires |

**Indexes:**
- UNIQUE constraint on `email` ensures no duplicate accounts

**Example Record:**
```json
{
  "id": 1,
  "email": "john.doe@example.com",
  "password_hash": "3a5c1d2e...",
  "password_salt": "f7a2b8d9...",
  "role": "tenant",
  "created_at": "2026-08-19T10:30:00Z",
  "name": "John Doe",
  "requires_change_password": 0,
  "temp_password_expiration": null
}
```

---

### tenants

Stores rental tenant information and financial data linked to users.

```sql
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  balance REAL DEFAULT 0,
  deposit REAL DEFAULT 0,
  rent_amount REAL NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly',
  leased_unit TEXT NOT NULL,
  onboard_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique tenant identifier |
| user_id | INTEGER | NOT NULL, FK → users.id | Link to user account |
| balance | REAL | DEFAULT 0 | Current account balance |
| deposit | REAL | DEFAULT 0 | Security deposit amount |
| rent_amount | REAL | NOT NULL | Monthly rent amount |
| billing_cycle | TEXT | DEFAULT 'monthly' | Billing frequency |
| leased_unit | TEXT | NOT NULL | Unit identifier (e.g., "Apt 101") |
| onboard_date | TEXT | NOT NULL | ISO 8601 date tenant started lease |
| created_at | TEXT | NOT NULL | ISO 8601 timestamp of record creation |

**Relationships:**
- FOREIGN KEY relationship with `users` table
- One user can have multiple tenant records (one-to-many)
- Deleting a user cascades to tenant records (if ON DELETE CASCADE configured)

**Example Record:**
```json
{
  "id": 1,
  "user_id": 1,
  "balance": 500.00,
  "deposit": 1500.00,
  "rent_amount": 1000.00,
  "billing_cycle": "monthly",
  "leased_unit": "Apt 101",
  "onboard_date": "2026-08-01",
  "created_at": "2026-08-19T10:30:00Z"
}
```

---

### refresh_tokens

Stores valid refresh tokens for the token refresh mechanism.

```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique token record identifier |
| user_id | INTEGER | NOT NULL, FK → users.id | User who owns token |
| token | TEXT | NOT NULL | JWT refresh token (encrypted storage recommended) |
| expires_at | TEXT | NOT NULL | ISO 8601 timestamp when token expires |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Timestamp of token creation |

**Relationships:**
- FOREIGN KEY relationship with `users` table
- One user can have multiple refresh tokens (one-to-many)

**Lifecycle:**
- Created when user logs in
- Deleted when user logs out or token expires
- Checked before issuing new access tokens

**Example Record:**
```json
{
  "id": 1,
  "user_id": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-09-19T10:30:00Z",
  "created_at": "2026-08-19T10:30:00Z"
}
```

---

### password_resets

Stores password reset tokens for the forgotten password flow.

```sql
CREATE TABLE password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique reset record identifier |
| user_id | INTEGER | NOT NULL, FK → users.id | User requesting password reset |
| token | TEXT | NOT NULL | Unique reset token (JWT or random) |
| expires_at | TEXT | NOT NULL | ISO 8601 timestamp when token expires (1 hour typical) |
| used | INTEGER | DEFAULT 0 | Flag: 1 if token has been used (prevents reuse) |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Timestamp of reset request |

**Relationships:**
- FOREIGN KEY relationship with `users` table
- One user can have multiple reset tokens (one-to-many)

**Lifecycle:**
- Created when user requests password reset
- Marked as `used = 1` after successful password change
- Expires after 1 hour
- Should be deleted after expiration

**Example Record:**
```json
{
  "id": 1,
  "user_id": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-08-19T11:30:00Z",
  "used": 0,
  "created_at": "2026-08-19T10:30:00Z"
}
```

---

### signup_keys

Stores invitation codes for user registration (prevents open registration).

```sql
CREATE TABLE signup_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  used INTEGER DEFAULT 0,
  user_id INTEGER
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique key record identifier |
| code | TEXT | NOT NULL, UNIQUE | Invitation code (e.g., "INVITE123ABC") |
| used | INTEGER | DEFAULT 0 | Flag: 1 if code has been used |
| user_id | INTEGER | NULL | User who used this code (NULL if unused) |

**Relationships:**
- Loose relationship with `users` (by design for security)
- One code can only be used once (UNIQUE constraint)

**Lifecycle:**
- Created by admin for distribution
- Checked during signup
- Marked as `used = 1` and `user_id` set after signup
- Expired codes should be cleaned up

**Example Records:**
```json
{
  "id": 1,
  "code": "INVITE123ABC",
  "used": 1,
  "user_id": 1
},
{
  "id": 2,
  "code": "INVITE456DEF",
  "used": 0,
  "user_id": null
}
```

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
├─────────────┤
│ id (PK)     │
│ email       │
│ password... │
│ role        │
│ name        │
│ created_at  │
└──────┬──────┘
       │ (1:N)
       │
       ├──────→ ┌──────────────────┐
       │        │    tenants       │
       │        ├──────────────────┤
       │        │ id (PK)          │
       │        │ user_id (FK)     │
       │        │ balance          │
       │        │ deposit          │
       │        │ rent_amount      │
       │        │ leased_unit      │
       │        │ onboard_date     │
       │        │ created_at       │
       │        └──────────────────┘
       │
       ├──────→ ┌──────────────────┐
       │        │ refresh_tokens   │
       │        ├──────────────────┤
       │        │ id (PK)          │
       │        │ user_id (FK)     │
       │        │ token            │
       │        │ expires_at       │
       │        │ created_at       │
       │        └──────────────────┘
       │
       └──────→ ┌──────────────────┐
                │ password_resets  │
                ├──────────────────┤
                │ id (PK)          │
                │ user_id (FK)     │
                │ token            │
                │ expires_at       │
                │ used             │
                │ created_at       │
                └──────────────────┘

┌──────────────────┐
│  signup_keys     │
├──────────────────┤
│ id (PK)          │
│ code (UNIQUE)    │
│ used             │
│ user_id (loose)  │
└──────────────────┘
```

---

## Common Queries

### Find user by email
```sql
SELECT * FROM users WHERE email = ?
```

### Get all tenants for a user
```sql
SELECT * FROM tenants WHERE user_id = ?
```

### Get tenant with user information
```sql
SELECT t.*, u.email, u.name 
FROM tenants t 
JOIN users u ON t.user_id = u.id 
WHERE t.id = ?
```

### Check if signup code is valid
```sql
SELECT * FROM signup_keys WHERE code = ? AND used = 0
```

### Get all valid refresh tokens
```sql
SELECT * FROM refresh_tokens 
WHERE user_id = ? AND expires_at > datetime('now')
```

### Find expired password reset tokens
```sql
SELECT * FROM password_resets 
WHERE expires_at < datetime('now') OR used = 1
```

---

## Database Constraints & Integrity

### Primary Keys
- All tables use AUTOINCREMENT for id generation
- Ensures unique identification

### Foreign Keys
- `tenants.user_id` → `users.id`
- `refresh_tokens.user_id` → `users.id`
- `password_resets.user_id` → `users.id`
- Maintains referential integrity

### Unique Constraints
- `users.email` - Prevents duplicate accounts
- `signup_keys.code` - One-time use codes

### Default Values
- `tenants.balance` defaults to 0
- `tenants.deposit` defaults to 0
- `tenants.billing_cycle` defaults to 'monthly'
- `users.requires_change_password` defaults to 0
- `password_resets.used` defaults to 0
- `signup_keys.used` defaults to 0

### NOT NULL Constraints
- User: email, password_hash, password_salt, role, created_at
- Tenant: user_id, rent_amount, leased_unit, onboard_date, created_at
- Refresh Token: user_id, token, expires_at
- Password Reset: user_id, token, expires_at
- Signup Key: code

---

## Data Types

### TEXT
Used for:
- Email addresses
- Names
- Tokens (should consider TEXT storage security)
- ISO 8601 timestamps (for portability)
- Identifiers (leased_unit)

### REAL
Used for:
- Monetary values (balance, deposit, rent_amount)
- Better precision than INTEGER for financial data
- Note: Ensure validation prevents NaN

### INTEGER
Used for:
- Primary keys (id)
- Flags/booleans (used, requires_change_password)
- Foreign key references

---

## Performance Optimization

### Indexes
Current indexes (automatic):
- PRIMARY KEY on all id columns
- UNIQUE on users.email
- UNIQUE on signup_keys.code

### Recommended Additional Indexes
```sql
-- For user queries by email
CREATE INDEX idx_users_email ON users(email);

-- For tenant queries by user
CREATE INDEX idx_tenants_user_id ON tenants(user_id);

-- For token cleanup (expired records)
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
```

### Query Optimization
- Always validate input to ensure index usage
- Use parameterized queries to prevent injection
- Consider pagination for list operations

---

## Backup & Recovery

### Regular Backups
- Export D1 database periodically
- Store backups securely
- Test restore procedures

### Data Retention
- Clean up expired tokens regularly
- Retention policy for password reset tokens (suggest 30 days)
- Archive old user records if needed

---

## Migration Strategy

### Applying Migrations
```bash
npm run dev
```

This automatically applies all pending migrations from `migrations/` folder.

### Adding New Migrations
1. Create new file: `migrations/0002_add_feature.sql`
2. Run `npm run dev` to apply
3. Commit migration file to git

### Schema Changes
Use standard SQLite ALTER commands:
```sql
ALTER TABLE users ADD COLUMN new_column TEXT;
```

---

## Security Considerations

### Password Storage
- Passwords stored as PBKDF2-SHA256 hashes
- Salt stored separately in password_salt
- Never store plain text passwords

### Token Storage
- Refresh tokens should be encrypted before storing
- Consider using KV Store for token cache
- Set appropriate expiration times

### Data Access
- Always use parameterized queries
- Validate all inputs before queries
- Implement proper authorization checks
- Log sensitive operations

### PII Protection
- Minimize collection of personal data
- Implement data retention policies
- Ensure proper access controls
- Consider encryption for sensitive fields

---

## Monitoring & Maintenance

### Health Checks
- Monitor database connection status
- Track query performance
- Alert on failed migrations

### Cleanup Tasks
- Remove expired refresh tokens (daily)
- Remove expired password reset tokens (daily)
- Archive old records (monthly)
- Monitor database size growth

### Metrics to Track
- Number of active users
- Active tenant records
- Failed login attempts (via rate limiter)
- Token usage patterns
