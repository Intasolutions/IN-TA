// Material Symbols icon. New icon names must also be added to MATERIAL_ICONS in app/layout.tsx.
// Size it with a text-* class: Google's stylesheet pins .material-symbols-outlined to 24px and beats
// Tailwind utilities, so the glyph is set to 1em of this wrapper instead.
export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center leading-none ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: '1em', lineHeight: 1 }}>
        {name}
      </span>
    </span>
  );
}
