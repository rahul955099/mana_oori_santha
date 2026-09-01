import { Link } from "react-router-dom";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r="32" fill="#2F6F2A" />
      <path
        d="M32 47c-8.5 0-15-6.5-15-15 0-9.5 7.5-19 15-23 7.5 4 15 13.5 15 23 0 8.5-6.5 15-15 15z"
        fill="#E59F3F"
      />
      <path d="M32 12c-2.2 8.5-2.2 25.5 0 35" stroke="#2F6F2A" strokeWidth="2" fill="none" opacity="0.55" />
    </svg>
  );
}

export function Logo({
  size = 40,
  showText = true,
  dark = false,
}: {
  size?: number;
  showText?: boolean;
  dark?: boolean;
}) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={`text-lg font-extrabold tracking-tight sm:text-xl ${dark ? "text-white" : "text-primary-700"}`}
          >
            MANA OORI SANTHA
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${dark ? "text-accent-300" : "text-accent-600"}`}
          >
            Local &amp; Natural Marketplace
          </span>
        </span>
      )}
    </Link>
  );
}
