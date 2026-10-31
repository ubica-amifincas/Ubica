/**
 * Logo de AMI Fincas (la casa con «AMI») en vectorial, redibujado del PNG original. Los dos colores se pueden
 * cambiar: sobre fondos del azul de la marca, la parte azul pasa a blanco y el logo va sin caja.
 */
export default function AmiLogoMark({ className = '', green = '#9dcc87', blue = '#1f8399' }: {
  className?: string; green?: string; blue?: string;
}) {
  return (
    <svg viewBox="190 293 632 450" className={className} role="img" aria-label="AMI Fincas">
      <g fill={green}>
        <path d="M259 487 L533 303 L533 355 L339 487 Z" />
        <path fillRule="evenodd" d="M199 733 L310 487 L359 487 L461 712 Q467 728 482 733 L423 733 L394 668 L273 668 L243 733 Z M290 628 L334 527 L377 628 Z" />
        <path d="M566 641 L668 487 L721 487 L721 733 L679 733 L679 545 L591 676 Z" />
      </g>
      <g fill={blue}>
        <path d="M533 303 L620 362 L620 415 L533 355 Z" />
        <path d="M632 317 L710 317 L710 419 L812 487 L723 487 L632 425 Z" />
        <path d="M458 487 L509 487 L590 601 L566 641 L500 549 L500 733 L494 733 L458 686 Z" />
        <path d="M750 505 L796 505 L796 733 L750 733 Z" />
      </g>
    </svg>
  );
}
