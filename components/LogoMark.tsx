/**
 * HiveMind mark — "inverse spark cell": hex cell outline (ink) with the
 * amber six-spoke spark. Inlined from the brand kit (logo-mark.svg) so the
 * header renders it with zero extra requests. Colors are fixed per the
 * brand usage rules — do not recolor the spark.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 5 L55.4 18.5 L55.4 45.5 L32 59 L8.6 45.5 L8.6 18.5 Z"
        fill="none"
        stroke="#F4EFE7"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <line x1="32" y1="19" x2="32" y2="45" stroke="#F6B93B" strokeWidth="5" strokeLinecap="round" />
      <line x1="20.7" y1="25.5" x2="43.3" y2="38.5" stroke="#F6B93B" strokeWidth="5" strokeLinecap="round" />
      <line x1="43.3" y1="25.5" x2="20.7" y2="38.5" stroke="#F6B93B" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
