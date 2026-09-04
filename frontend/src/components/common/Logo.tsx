import { Link } from "react-router-dom";

const LOGO_SRC = "/assets/mana-oori-santha-logo.png";
// Intrinsic size of the source artwork, used to preserve aspect ratio at any render size.
const LOGO_WIDTH = 1045;
const LOGO_HEIGHT = 626;
const LOGO_ASPECT_RATIO = LOGO_WIDTH / LOGO_HEIGHT;

interface LogoProps {
  /** Rendered height in pixels; width is derived from the logo's aspect ratio. */
  size?: number;
  /** Wraps the logo in a white chip so it stays legible on dark backgrounds (e.g. the footer). */
  dark?: boolean;
  className?: string;
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Mana Oori Santha"
      width={Math.round(size * LOGO_ASPECT_RATIO)}
      height={size}
      className="shrink-0 object-contain"
      style={{ height: size, width: "auto" }}
    />
  );
}

export function Logo({ size = 40, dark = false, className = "" }: LogoProps) {
  const height = size * 1.7;
  const img = (
    <img
      src={LOGO_SRC}
      alt="Mana Oori Santha - Modern Mart with Village Heart"
      width={Math.round(height * LOGO_ASPECT_RATIO)}
      height={Math.round(height)}
      className="block object-contain"
      style={{ height, width: "auto" }}
    />
  );

  return (
    <Link to="/" className={`flex items-center ${className}`}>
      {dark ? <span className="rounded-xl bg-white p-2 shadow-sm">{img}</span> : img}
    </Link>
  );
}
