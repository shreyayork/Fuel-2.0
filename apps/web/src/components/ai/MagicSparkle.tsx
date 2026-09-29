/**
 * Small four-point sparkle glyph rendered in teal. Use it as a leading
 * adornment ("✦ AI did this") or right next to an extracted value.
 */
export function MagicSparkle({
  size = 12,
  color = "#00B48A",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.12em" }}
    >
      <path
        fill={color}
        d="M12 2c.6 0 1.1.4 1.2 1l1 5c.1.5.5.9 1 1l5 1c.6.1 1 .6 1 1.2s-.4 1.1-1 1.2l-5 1c-.5.1-.9.5-1 1l-1 5c-.1.6-.6 1-1.2 1s-1.1-.4-1.2-1l-1-5c-.1-.5-.5-.9-1-1l-5-1c-.6-.1-1-.6-1-1.2s.4-1.1 1-1.2l5-1c.5-.1.9-.5 1-1l1-5C10.9 2.4 11.4 2 12 2z"
      />
    </svg>
  );
}
