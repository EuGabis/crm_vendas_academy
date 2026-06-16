/**
 * GET /api/guru/ping
 * Health check — confirma se a env var foi lida sem chamar a Guru.
 */
import type { RequestLike, ResponseLike } from './client';

export default function handler(_req: RequestLike, res: ResponseLike) {
  const token = process.env.GURU_API_TOKEN ?? '';
  const base = process.env.GURU_API_BASE_URL ?? 'https://digitalmanager.guru/api/v2';
  return res.status(200).json({
    ok: true,
    tokenConfigured: token.length > 0,
    tokenLength: token.length,
    tokenPreview:
      token.length > 10 ? token.slice(0, 6) + '...' + token.slice(-4) : '(missing)',
    baseUrl: base,
    timestamp: new Date().toISOString(),
  });
}
