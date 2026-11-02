import Header from '../components/Header';
import Footer from '../components/Footer';
import SystemMap, { type MapService } from '../components/about/SystemMap';
import { CLIENTS_PATH, toClients, type MapClient } from '../components/about/clients';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ApiService = { title: string; slug: string; short_description?: string | null; order?: number; is_active?: boolean };

async function getServices(): Promise<MapService[]> {
  try {
    const res = await fetch(`${apiBase}/api/services/`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ApiService[] = Array.isArray(data) ? data : data.results ?? [];
    return list
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => ({ title: s.title.trim(), slug: s.slug, description: s.short_description?.trim() ?? '' }));
  } catch {
    return []; // the map falls back to the service names it already knows
  }
}

async function getClients(): Promise<MapClient[]> {
  try {
    const res = await fetch(`${apiBase}${CLIENTS_PATH}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    return res.ok ? toClients(await res.json(), apiBase) : [];
  } catch {
    return []; // the page asks again from the browser
  }
}

export default async function Page() {
  const [services, clients] = await Promise.all([getServices(), getClients()]);
  return (
    <>
      <Header />
      <main>
        <SystemMap services={services} clients={clients} />
      </main>
      <Footer />
    </>
  );
}
