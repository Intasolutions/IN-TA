// Material Symbols icon. New icon names must also be added to MATERIAL_ICONS in app/layout.tsx.
// Size it with a text-* class: Google's stylesheet pins .material-symbols-outlined to 24px and beats
// Tailwind utilities, so the glyph is set to 1em of this wrapper instead (globals.css).
// The name is drawn by CSS (`content: attr(data-icon)`), not written into the page: as text, crawlers and AI readers
// read it as words ("location_onThonichal … 670645arrow_outward" in the 2026-11-21 SEO audit).
export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center leading-none ${className}`}>
      <span className="material-symbols-outlined" data-icon={name} />
    </span>
  );
}
