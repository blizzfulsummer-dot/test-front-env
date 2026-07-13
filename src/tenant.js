import { parseJsonBody, validatePassword, validateTenantPayload } from './lib/validation.js';

export async function createTenant(request, env, authUser) {
  if (authUser.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const validation = validateTenantPayload(parsed.data);
  if (!validation.ok) return json({ error: 'Invalid tenant payload', details: validation.errors }, 400);

  const {
    user_id,
    balance,
    deposit,
    rent_amount,
    billing_cycle,
    leased_unit,
    onboard_date
  } = parsed.data;

  if (!user_id) {
    return json({ error: 'Missing required fields' }, 400);
  }

  await env.DB
    .prepare(`
      INSERT INTO tenants
        (user_id, balance, deposit, rent_amount, billing_cycle, leased_unit, onboard_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      user_id,
      balance ?? 0,
      deposit ?? 0,
      rent_amount,
      billing_cycle ?? 'monthly',
      leased_unit,
      onboard_date,
      new Date().toISOString()
    )
    .run();

  return json({ success: true });
}

export async function listTenants(request, env, authUser) {
  if (authUser.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  const rows = await env.DB
    .prepare(`
      SELECT
        t.id,
        u.email,
        u.name,
        u.role,
        t.balance,
        t.rent_amount,
        t.leased_unit,
        t.onboard_date
      FROM tenants t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
    `)
    .all();

  return json({ tenants: rows.results });
}

export async function getTenant(request, env, authUser, tenantId) {
  const row = await env.DB
    .prepare(`
      SELECT t.*, u.email, u.name, u.role
      FROM tenants t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = ?
    `)
    .bind(tenantId)
    .first();

  if (!row) return json({ error: 'Tenant not found' }, 404);

  if (authUser.role !== 'admin' && row.user_id !== authUser.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  if (authUser.role === 'admin') {
    return json({ tenant: row });
  }

  return json({
    tenant: {
      id: row.id,
      user_id: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      leased_unit: row.leased_unit,
      onboard_date: row.onboard_date,
      billing_cycle: row.billing_cycle
    }
  });
}

export async function updateTenant(request, env, authUser, tenantId) {
  const tenant = await env.DB
    .prepare('SELECT id, user_id FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first();

  if (!tenant) return json({ error: 'Tenant not found' }, 404);

  if (authUser.role !== 'admin' && tenant.user_id !== authUser.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  if (authUser.role === 'admin') {
    await env.DB
      .prepare(`
        UPDATE tenants SET
          balance = ?,
          deposit = ?,
          rent_amount = ?,
          billing_cycle = ?,
          leased_unit = ?
        WHERE id = ?
      `)
      .bind(
        parsed.data.balance,
        parsed.data.deposit,
        parsed.data.rent_amount,
        parsed.data.billing_cycle,
        parsed.data.leased_unit,
        tenantId
      )
      .run();

    return json({ success: true });
  }

  const currentPassword = parsed.data?.currentPassword ?? parsed.data?.oldPassword;
  const newPassword = parsed.data?.newPassword ?? parsed.data?.password;

  if (!currentPassword || !newPassword) {
    return json({ error: 'Missing password fields' }, 400);
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.ok) {
    return json({ error: 'Password is too weak' }, 400);
  }

  const userRow = await env.DB
    .prepare('SELECT id, password_hash, password_salt FROM users WHERE id = ?')
    .bind(tenant.user_id)
    .first();

  if (!userRow) return json({ error: 'User not found' }, 404);

  const valid = await verifyPBKDF2(userRow.password_hash, userRow.password_salt, currentPassword);
  if (!valid) return json({ error: 'Current password is incorrect' }, 401);

  const { hash: derivedBits, salt } = await hashPBKDF2(newPassword);
  await env.DB
    .prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(arrayBufferToHex(derivedBits), arrayBufferToHex(salt), userRow.id)
    .run();

  return json({ success: true, message: 'Password updated successfully' });
}

export async function deleteTenant(request, env, authUser, tenantId) {
  if (authUser.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  await env.DB
    .prepare('DELETE FROM tenants WHERE id = ?')
    .bind(tenantId)
    .run();

  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function verifyPBKDF2(storedHex, saltHex, password) {
  const salt = hexToArrayBuffer(saltHex);
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return arrayBufferToHex(derivedBits) === storedHex;
}

async function hashPBKDF2(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return { hash: derivedBits, salt };
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}
