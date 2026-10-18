// Material Symbols icon. New icon names must also be added to MATERIAL_ICONS in app/layout.tsx.
export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}
