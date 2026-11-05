/**
 * Fuel Platform brand mark for the Fuel 2.1 sidebar.
 * Prefers the uploaded YORK · IE / FUEL PLATFORM PNG lockup (theme variants);
 * falls back to an SVG isometric icon + typography if images fail to load.
 */
import { useState, type CSSProperties } from "react";

const LOGO_GREEN = "#00B48A";

const LOGO_FULL_DARK = "/brand/logo-york-fuel-platform-clear.png";
const LOGO_FULL_LIGHT = "/brand/logo-york-fuel-platform-light.png";
const LOGO_COMPACT = "/brand/logo-fuel-platform-clear.png";

/** Wireframe isometric mark matching the Fuel Platform PNG icon (fallback). */
export function FuelIsometricIcon({
  size = 28,
  color = LOGO_GREEN,
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        stroke={color}
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M21 14.5 L27.5 18.2 V25.8 L21 29.5 L14.5 25.8 V18.2 Z" />
        <path d="M21 14.5 L27.5 10.8 L21 7.2 L14.5 10.8 Z" />
        <path d="M21 14.5 V7.2" />
        <path d="M14.5 10.8 V18.2" />
        <path d="M27.5 10.8 V18.2" />
        <path d="M14.5 25.8 L8 22.1 L8 14.5 L14.5 18.2" />
        <path d="M8 22.1 L14.5 25.8 V33.5 L8 29.8 V22.1" />
        <path d="M14.5 33.5 L21 29.5" />
        <path d="M27.5 25.8 L34 22.1 L34 14.5 L27.5 18.2" />
        <path d="M34 22.1 L27.5 25.8 V33.5 L34 29.8 V22.1" />
        <path d="M27.5 33.5 L21 29.5" />
        <path d="M14.5 10.8 L8 14.5" />
        <path d="M27.5 10.8 L34 14.5" />
        <path d="M8 29.8 L14.5 33.5 L21 37 L27.5 33.5 L34 29.8" />
        <path d="M21 37 V29.5" />
      </g>
    </svg>
  );
}

type MarkVariant = "full" | "compact";

function SvgLockup({
  theme,
  variant,
}: {
  theme: "dark" | "light";
  variant: MarkVariant;
}) {
  const yorkColor = theme === "dark" ? "#F4F6F8" : "#284256";
  return (
    <>
      <FuelIsometricIcon size={variant === "full" ? 30 : 26} color={LOGO_GREEN} />
      <div className="f21-brand-mark-text">
        {variant === "full" ? (
          <>
            <span className="f21-brand-york" style={{ color: yorkColor }}>
              YORK <span className="f21-brand-dot" aria-hidden="true">
                •
              </span>{" "}
              IE
            </span>
            <span className="f21-brand-fuel" style={{ color: LOGO_GREEN }}>
              FUEL PLATFORM
            </span>
          </>
        ) : (
          <span className="f21-brand-fuel f21-brand-fuel--solo" style={{ color: LOGO_GREEN }}>
            FUEL PLATFORM
          </span>
        )}
      </div>
    </>
  );
}

export function FuelSidebarBrand({
  theme = "dark",
  className,
  style,
}: {
  theme?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = theme === "light" ? LOGO_FULL_LIGHT : LOGO_FULL_DARK;
  const label = "York IE Fuel Platform";

  return (
    <div
      className={`f21-sidebar-brand${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={label}
    >
      {imgFailed ? (
        <SvgLockup theme={theme} variant="full" />
      ) : (
        <img
          className="f21-sidebar-brand-img"
          src={src}
          alt={label}
          width={152}
          height={34}
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}

export function FuelPlatformMark({
  theme = "dark",
  variant = "full",
  className,
  style,
}: {
  theme?: "dark" | "light";
  /** full = YORK · IE + FUEL PLATFORM; compact = FUEL PLATFORM only */
  variant?: MarkVariant;
  className?: string;
  style?: CSSProperties;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src =
    variant === "compact"
      ? LOGO_COMPACT
      : theme === "light"
        ? LOGO_FULL_LIGHT
        : LOGO_FULL_DARK;
  const label = variant === "full" ? "York IE Fuel Platform" : "Fuel Platform";

  return (
    <div
      className={`f21-brand-mark f21-brand-mark--${variant}${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={label}
    >
      {imgFailed ? (
        <SvgLockup theme={theme} variant={variant} />
      ) : (
        <img
          className="f21-brand-mark-img"
          src={src}
          alt={label}
          width={190}
          height={42}
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}
