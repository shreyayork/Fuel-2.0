/**
 * Product / brand marks for Fuel 2.1 connectors + files.
 * Slack & HubSpot paths from Simple Icons (CC0 1.0).
 * Granola uses a compact organic-G mark matching the product’s green notepad identity
 * (hand-drawn G aesthetic — monochrome currentColor for UI chrome).
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
    focusable: false as const,
    ...rest,
  };
}

/** Slack octothorpe — Simple Icons */
export function SlackIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.53 2.53 0 0 1-2.52 2.523A2.53 2.53 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52a2.527 2.527 0 0 1 2.521 2.52v6.313A2.53 2.53 0 0 1 8.834 24a2.53 2.53 0 0 1-2.521-2.522zM8.834 5.042a2.53 2.53 0 0 1-2.521-2.52A2.53 2.53 0 0 1 8.834 0a2.53 2.53 0 0 1 2.521 2.522v2.52zm0 1.271a2.53 2.53 0 0 1 2.521 2.521a2.53 2.53 0 0 1-2.521 2.521H2.522A2.53 2.53 0 0 1 0 8.834a2.53 2.53 0 0 1 2.522-2.521zm10.122 2.521a2.53 2.53 0 0 1 2.522-2.521A2.53 2.53 0 0 1 24 8.834a2.53 2.53 0 0 1-2.522 2.521h-2.522zm-1.268 0a2.53 2.53 0 0 1-2.523 2.521a2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.53 2.53 0 0 1 2.523 2.522zm-2.523 10.122a2.53 2.53 0 0 1 2.523 2.522A2.53 2.53 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522zm0-1.268a2.527 2.527 0 0 1-2.52-2.523a2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.53 2.53 0 0 1-2.522 2.523z" />
    </svg>
  );
}

/** HubSpot sprocket — Simple Icons */
export function HubSpotIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} xmlns="http://www.w3.org/2000/svg">
      <path d="M18.164 7.93V5.084a2.2 2.2 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.2 2.2 0 0 0 1.252 1.973l.013.006v2.852a6.2 6.2 0 0 0-2.969 1.31l.012-.01l-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006l7.697 5.991a6.2 6.2 0 0 0-1.038 3.446a6.2 6.2 0 0 0 1.147 3.607l-.013-.02l-2.342 2.343a2 2 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033a2 2 0 0 0-.1-.595l.005.014l2.317-2.317a6.247 6.247 0 1 0 4.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 1 1 3.215-3.207v.002a3.206 3.206 0 0 1-3.207 3.207z" />
    </svg>
  );
}

/**
 * Granola — compact organic G mark (meeting notepad product).
 * Drawn to read as Granola’s imperfect handwritten G at small sizes.
 */
export function GranolaIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.4 3.1c-3.9-.2-7.1 2.4-7.4 6.4-.3 3.7 2.1 7 5.9 7.6 2.3.4 4.6-.3 6.1-1.9.4-.4.3-1.1-.2-1.4l-1.3-.8c-.4-.2-.9-.1-1.2.2-1 .9-2.3 1.3-3.6 1.1-2.2-.3-3.7-2.2-3.5-4.4.2-2.2 2.1-3.8 4.3-3.7 1.4.1 2.6.8 3.3 1.9.2.4.7.5 1.1.3l1.4-.7c.5-.3.7-.9.4-1.4-1.3-2.1-3.6-3.1-6.3-3.2z" />
      <path d="M14.2 11.2h3.8c.5 0 .9.4.9.9v1.1c0 2.6-1.7 4.8-4.2 5.5-2.7.8-5.5-.3-6.9-2.6-.3-.4-.1-1 .3-1.2l1.3-.6c.4-.2.9 0 1.1.4.8 1.2 2.3 1.8 3.8 1.4 1.2-.3 2.1-1.4 2.1-2.6v-.3h-2.2c-.5 0-.9-.4-.9-.9v-1.2c0-.5.4-.9.9-.9z" />
    </svg>
  );
}

/** Stripe wordmark glyph (S mark) — Simple Icons inspired mark for recently viewed */
export function StripeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} xmlns="http://www.w3.org/2000/svg">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.876 4.61 3.107 3.85 4.794 3.85 7.044c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.715 24c2.641 0 4.843-.624 6.328-1.813 1.585-1.27 2.384-3.132 2.384-5.579 0-4.127-2.524-5.851-6.451-7.458z" />
    </svg>
  );
}

/** Adyen mark — Simple Icons */
export function AdyenIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.932 17.041v1.598c0 .288.01.576.029.854a5.79 5.79 0 0 1-.51-.029 8.35 8.35 0 0 1-1.396-.222 6.027 6.027 0 0 1-2.293-1.079 5.771 5.771 0 0 1-1.742-1.896c-.462-.788-.693-1.732-.693-2.83 0-1.156.25-2.138.75-2.945a5.56 5.56 0 0 1 1.964-1.896 5.886 5.886 0 0 1 2.704-.74c.192 0 .385.01.587.02.192.019.385.038.587.067v7.791a4.49 4.49 0 0 0 .013.507zm-5.02-4.72c0 1.07.212 1.905.645 2.503a2.957 2.957 0 0 0 1.79 1.204V8.68a3.1 3.1 0 0 0-.74.086 2.75 2.75 0 0 0-1.002.423 2.763 2.763 0 0 0-.75.769c-.212.327-.308.788-.308 1.386h-.001zM17.75 17.47c.423.27.933.405 1.53.405.27 0 .54-.029.809-.086a3.53 3.53 0 0 0 .75-.25v-2.062a2.633 2.633 0 0 1-.52.154 3.11 3.11 0 0 1-.51.048c-.385 0-.693-.067-.924-.202a.92.92 0 0 1-.366-.577 3.977 3.977 0 0 1-.048-.673V4.412l-2.1.385v9.98c0 .924.14 1.626.423 2.1.28.462.72.808 1.25 1.05l-.004-.001zM22.679 0H1.321A1.32 1.32 0 0 0 0 1.321v21.358C0 23.41.59 24 1.321 24h21.358A1.32 1.32 0 0 0 24 22.679V1.321A1.32 1.32 0 0 0 22.679 0z" />
    </svg>
  );
}

export type ConnectorBrand = "slack" | "granola" | "hubspot";

export function ConnectorBrandIcon({
  brand,
  size = 14,
  className,
}: {
  brand: ConnectorBrand;
  size?: number;
  className?: string;
}) {
  if (brand === "slack") return <SlackIcon size={size} className={className} />;
  if (brand === "hubspot") return <HubSpotIcon size={size} className={className} />;
  return <GranolaIcon size={size} className={className} />;
}
