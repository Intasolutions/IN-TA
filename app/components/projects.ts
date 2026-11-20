// What the home page's Work section needs from the API's projects. Nothing here touches the browser or React: the home
// page reads them on the server, and in the browser only if the server couldn't (see Work.tsx).

export type Project = {
  id: number;
  title: string;
  slug: string;
  role: string;
  summary: string;
  hero: string;
  tags: { name: string; slug: string }[];
  external_url: string;
  featured: boolean;
  order: number;
  /** it has a page of its own (/portfolio/<slug>) */
  case_study?: boolean;
};

/** The projects as the API sends them, featured first, then in their order */
export const toProjects = (data: unknown): Project[] => {
  const list = (Array.isArray(data) ? data : (data as { results?: Project[] })?.results ?? []) as Project[];
  return [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
};
