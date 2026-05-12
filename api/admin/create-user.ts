/**
 * Serverless function Vercel pra criar usuários no Supabase Auth.
 * Apenas admins podem chamar. service_role fica no env do Vercel,
 * nunca no frontend.
 *
 * POST /api/admin/create-user
 * Headers: Authorization: Bearer <admin-jwt>
 * Body: { email, password, full_name?, role? ('admin' | 'manager' | 'seller' | 'viewer'), seller_id? }
 */

interface RequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return res.status(500).json({
      error:
        'Variáveis SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY precisam estar configuradas no Vercel.',
    });
  }

  // 1. Validar o JWT do caller via Supabase Auth
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'];
  const token = Array.isArray(authHeader)
    ? authHeader[0]?.replace('Bearer ', '')
    : authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResp.ok) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  const callerUser = (await userResp.json()) as { id: string };

  // 2. Verificar que caller é admin (via profile)
  const profileResp = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerUser.id}&select=role`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!profileResp.ok) {
    return res.status(500).json({ error: 'Falha ao verificar permissão' });
  }
  const profiles = (await profileResp.json()) as Array<{ role: string }>;
  if (!profiles[0] || profiles[0].role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar usuários' });
  }

  // 3. Ler payload
  const body = (req.body ?? {}) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: 'admin' | 'manager' | 'seller' | 'viewer';
    seller_id?: string | null;
  };
  if (!body.email || !body.password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  if (body.password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }

  // 4. Criar user no Supabase Auth
  const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: body.full_name ? { full_name: body.full_name } : {},
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    return res.status(createResp.status).json({ error: errText });
  }
  const newUser = (await createResp.json()) as { id: string; email: string };

  // 5. Atualizar profile com role + seller_id (o trigger já criou com role=viewer)
  const finalRole = body.role ?? 'viewer';
  if (finalRole !== 'viewer' || body.seller_id !== undefined) {
    const updatePayload: Record<string, unknown> = { role: finalRole };
    if (body.seller_id !== undefined) updatePayload.seller_id = body.seller_id;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${newUser.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(updatePayload),
    });
  }

  return res.status(200).json({
    id: newUser.id,
    email: newUser.email,
    role: finalRole,
  });
}
