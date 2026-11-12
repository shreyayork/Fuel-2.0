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

/** Fuel platform mark (solid filled isometric icon, 574×607 viewBox). */
const FUEL_MARK_PATH =
  "M460.26,61.53l-85.4,49.3L200.62,10.24,9.5,120.57v118.1L94.89,288V489.17L286,599.5l102.27-59v-98.6l174.24-100.6V120.57Zm13.41,110.35V100.25l62,35.81v71.63Zm0,102.6V202.85l62,35.82v71.62ZM299.43,359.59V288l147.41-85.11v71.63ZM446.84,100.25v71.63l-58.56,33.8V134.06ZM361.46,441.87v67.61l-62-35.81V406.05ZM183.74,252.15V422.37l-62,35.82V288ZM197.15,445.6l62,35.82-62,35.81-62-35.81ZM272.6,288V458.18l-62-35.81V252.15ZM286,264.73,138.6,179.62l62-35.81L348,228.92ZM125.18,156.39V84.76l62-35.81v71.62Zm45.14,72.53-62,35.81L49.74,230.92l62-35.81Zm-72-128.67v71.63l-62,35.81V136.06ZM286,496.91l62,35.8-62,35.82-62-35.81ZM522.28,333.52,374.87,418.63l-62-35.81,147.42-85.11ZM361.46,134.06v71.62L214,120.57V49Z";

/** Fuel platform icon (fallback and sidebar mark). */
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
      height={(size * 607) / 574}
      viewBox="0 0 574 607"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color, flexShrink: 0, display: "block" }}
    >
      <path fill="currentColor" d={FUEL_MARK_PATH} />
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
  const fuelColor = theme === "dark" ? "#F4F6F8" : "#1A2332";
  return (
    <div
      className={`f21-sidebar-brand${className ? ` ${className}` : ""}`}
      style={style}
      aria-label="Fuel by York IE"
    >
      <FuelIsometricIcon size={22} color={LOGO_GREEN} />
      <span className="f21-sidebar-brand-word">
        <span className="f21-sidebar-brand-fuel" style={{ color: fuelColor }}>
          Fuel
        </span>
        <span className="f21-sidebar-brand-by">By York IE</span>
      </span>
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
