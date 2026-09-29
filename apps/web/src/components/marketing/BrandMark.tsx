/**
 * York IE geometric mark + "Fuel" wordmark.
 * Defaults match marketing/auth/footer (dark landing). Pass theme tokens
 * from Shell so the app sidebar shares the same lockup with editorial/signal colors.
 */
export function BrandMark({
  color = "#00B48A",
  ink = "#F4F6F8",
  muted = "#8A99A6",
  fontFamily = "Inter, -apple-system, system-ui, sans-serif",
  size = 28,
}: {
  color?: string;
  ink?: string;
  muted?: string;
  fontFamily?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: ink,
        fontFamily,
        fontWeight: 700,
        letterSpacing: 0.4,
        fontSize: 18,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 574 607"
        width={size}
        height={size}
        style={{ color, flexShrink: 0, display: "block" }}
        aria-label="York IE"
      >
        <path
          fill="currentColor"
          d="M460.26,61.53l-85.4,49.3L200.62,10.24,9.5,120.57v118.1L94.89,288V489.17L286,599.5l102.27-59v-98.6l174.24-100.6V120.57Zm13.41,110.35V100.25l62,35.81v71.63Zm0,102.6V202.85l62,35.82v71.62ZM299.43,359.59V288l147.41-85.11v71.63ZM446.84,100.25v71.63l-58.56,33.8V134.06ZM361.46,441.87v67.61l-62-35.81V406.05ZM183.74,252.15V422.37l-62,35.82V288ZM197.15,445.6l62,35.82-62,35.81-62-35.81ZM272.6,288V458.18l-62-35.81V252.15ZM286,264.73,138.6,179.62l62-35.81L348,228.92ZM125.18,156.39V84.76l62-35.81v71.62Zm45.14,72.53-62,35.81L49.74,230.92l62-35.81Zm-72-128.67v71.63l-62,35.81V136.06ZM286,496.91l62,35.8-62,35.82-62-35.81ZM522.28,333.52,374.87,418.63l-62-35.81,147.42-85.11ZM361.46,134.06v71.62L214,120.57V49Z"
        />
      </svg>
      <span>
        Fuel
        <span
          style={{
            color: muted,
            fontWeight: 400,
            fontSize: 12,
            marginLeft: 6,
            letterSpacing: 1,
          }}
        >
          BY YORK IE
        </span>
      </span>
    </span>
  );
}
