// Client logos, uploaded in the Django admin (Home > Client logos)

export type MapClient = { id: number; name: string; logo: string; description: string };

export const CLIENTS_PATH = '/api/home/clients/';

/** The API's list, cleaned up for the page */
export function toClients(data: unknown, apiBase: string): MapClient[] {
  const list = (Array.isArray(data) ? data : ((data as { results?: unknown[] })?.results ?? [])) as {
    id: number; name: string; logo?: string | null; description?: string | null;
  }[];
  return list
    .filter((c) => c.logo)
    .map((c) => ({
      id: c.id,
      name: c.name.trim(),
      logo: c.logo!.startsWith('/') ? `${apiBase}${c.logo}` : c.logo!,
      description: c.description?.trim() ?? '',
    }));
}
