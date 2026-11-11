// Called by the backend whenever something is saved in the admin (home/revalidate.py), so the website shows it on the
// next visit instead of after its caches run out (5 minutes to an hour). Needs REVALIDATE_SECRET, the same on both sides.
import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { API_TAG } from '../../site/cache';

const matches = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  if (!secret || !matches(request.headers.get('x-revalidate-secret') ?? '', secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  // the backend's data, gone at once (the next visit fetches it fresh), and every page built from it
  revalidateTag(API_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
  return Response.json({ revalidated: true });
}
