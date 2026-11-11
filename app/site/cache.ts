// Every request the website makes to the backend is cached under this tag, so that saving something in the admin can
// refresh the whole site at once (app/api/revalidate/route.ts, called by the backend: home/revalidate.py).
export const API_TAG = 'api';
