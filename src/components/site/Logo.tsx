import logoWhite from "@/assets/sccmu-logo-white.png.asset.json";

/**
 * SCCMU mark — animated rounded square with play triangle.
 * Brand colors come from the school logo (red + amber).
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-label="SCCMU" className="shrink-0">
      <defs>
        <linearGradient id="sccmu-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#F5B91E" />
        </linearGradient>
        <linearGradient id="sccmu-play" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <path
        d="M14 18 C14 12, 18 8, 24 8 L40 8 C46 8, 50 12, 50 18 L50 46 C50 52, 46 56, 40 56 L24 56 C18 56, 14 52, 14 46 Z"
        fill="none" stroke="url(#sccmu-ring)" strokeWidth="5" strokeLinecap="round"
      />
      <path d="M30 8 C30 4, 33 1, 36 3" fill="none" stroke="#F5B91E" strokeWidth="4" strokeLinecap="round" />
      <path d="M27 23 L43 32 L27 41 Z" fill="url(#sccmu-play)" />
    </svg>
  );
}

/** Header wordmark — just SCCMU, big and confident. */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={30} />
      <span className="font-display text-xl font-extrabold tracking-tight">SCCMU</span>
    </div>
  );
}

export function LogoFullWhite({ className = "", width = 180 }: { className?: string; width?: number }) {
  return <img src={logoWhite.url} alt="SCCMU" width={width} className={className} />;
}
