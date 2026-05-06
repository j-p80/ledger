const ALLOWED_ORIGIN = 'https://heirly.app';

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') ?? '';
  if (origin !== ALLOWED_ORIGIN && !origin.endsWith('.pages.dev')) {
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  const ct = request.headers.get('Content-Type') ?? '';
  try {
    body = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return jsonError(400, 'Invalid request body');
  }

  const { full_name, email, practice_name, role } = body;
  if (!full_name?.trim() || !email?.trim() || !practice_name?.trim() || !role?.trim()) {
    return jsonError(422, 'Missing required fields');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError(422, 'Invalid email address');
  }
  const validRoles = ['probate-solicitor', 'funeral-director', 'estate-agent', 'other'];
  if (!validRoles.includes(role)) {
    return jsonError(422, 'Invalid role value');
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/partner_enquiries`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      full_name:       full_name.trim().slice(0, 200),
      email:           email.trim().toLowerCase().slice(0, 254),
      practice_name:   practice_name.trim().slice(0, 200),
      role,
      client_volume:   body.client_volume   || null,
      referral_source: body.referral_source?.trim().slice(0, 500) || null,
      message:         body.message?.trim().slice(0, 2000)        || null,
      ip_address:      request.headers.get('CF-Connecting-IP'),
    }),
  });

  if (!res.ok) {
    console.error('Supabase error:', res.status, await res.text());
    return jsonError(502, 'Could not save enquiry. Please try again.');
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequest(ctx) {
  if (ctx.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  return onRequestPost(ctx);
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
