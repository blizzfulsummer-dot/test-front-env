export function validateEmail(value) {
  if (!value || typeof value !== 'string') {
    return { ok: false, errors: ['email'] };
  }

  const normalized = value.trim().toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  return {
    ok: isValid,
    errors: isValid ? [] : ['email']
  };
}

export function validatePassword(value) {
  if (!value || typeof value !== 'string') {
    return { ok: false, errors: ['password'] };
  }

  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const ok = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSymbol;

  return {
    ok,
    errors: ok ? [] : ['password']
  };
}

export function validateSignupPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['body'] };
  }

  const emailResult = validateEmail(payload.email);
  if (!emailResult.ok) errors.push('email');

  const role = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : '';
  if (!['admin', 'tenant', 'user'].includes(role)) {
    errors.push('role');
  }

  if (role === 'admin' && !payload.code) {
    errors.push('code');
  }

  if (role !== 'admin' && !payload.password && !payload.code) {
    errors.push('password');
  }

  return { ok: errors.length === 0, errors };
}

export function validateLoginPayload(payload) {
  const errors = [];
  const emailResult = validateEmail(payload?.email);
  if (!emailResult.ok) errors.push('email');

  if (!payload?.password || typeof payload.password !== 'string') {
    errors.push('password');
  }

  return { ok: errors.length === 0, errors };
}

export function validateTenantPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['body'] };
  }

  if (payload.balance === undefined || payload.balance === null) errors.push('balance');
  if (payload.deposit === undefined || payload.deposit === null) errors.push('deposit');
  if (payload.rent_amount === undefined || payload.rent_amount === null) errors.push('rent_amount');
  if (!payload.billing_cycle) errors.push('billing_cycle');
  if (!payload.leased_unit) errors.push('leased_unit');
  if (!payload.onboard_date) errors.push('onboard_date');

  return { ok: errors.length === 0, errors };
}

export async function parseJsonBody(request) {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
}
