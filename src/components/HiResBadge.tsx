interface HiResBadgeProps {
  isHiRes: boolean;
  className?: string;
}

export function HiResBadge({ isHiRes, className }: HiResBadgeProps) {
  if (!isHiRes) {
    return null;
  }

  return (
    <span className={`hires-badge ${className ?? ""}`.trim()} role="img" aria-label="Hi-Res enabled">
      {/*
        Reemplaza este span por el logo oficial Hi-Res cuando esté disponible.
        Recomendación: usa un archivo SVG para mantener nitidez en cualquier resolución.
        Inserción sugerida: <img src="/assets/hires-logo.svg" alt="Hi-Res Audio" className="hires-logo" />
        Escalado: controla tamaño desde CSS en .hires-logo con width/height y object-fit para ajustar el diseño.
      */}
      <span className="hires-logo-placeholder">Hi-Res</span>
    </span>
  );
}
