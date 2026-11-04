import { Package } from "lucide-react";

export function Thumb({ src, size = 64 }: { src?: string; size?: number }) {
  return (
    <div className="thumb" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" /> : <Package aria-hidden="true" />}
    </div>
  );
}
