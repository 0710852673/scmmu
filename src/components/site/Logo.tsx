import markAsset from "@/assets/sccmu-mark-only.png.asset.json";
import fullAsset from "@/assets/sccmu-logo-full.png.asset.json";

/** Just the SCCMU icon mark (transparent). */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt="SCCMU"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** Header wordmark: mark + SCCMU text. */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={30} />
      <span className="font-display text-xl font-extrabold tracking-tight">SCCMU</span>
    </div>
  );
}

/** Full white logo (mark + wordmark). Meant for dark backgrounds. */
export function LogoFullWhite({ className = "", width = 180 }: { className?: string; width?: number }) {
  return (
    <img
      src={fullAsset.url}
      alt="SCCMU — Sivali Central College Media Unit"
      className={`block h-auto ${className}`}
      style={{ width }}
    />
  );
}
