import { regionOk } from '../guide/shared';

// Whether this visit comes from outside the EEA, the UK and Switzerland (Vercel's country header, the same check as the
// robot's chat). The Meta Pixel only starts when it does: the site has no cookie-consent banner, which GDPR would require.
export function GET(request: Request) {
  return Response.json({ ok: regionOk(request) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
