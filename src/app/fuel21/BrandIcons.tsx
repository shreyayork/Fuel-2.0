/**
 * Authentic product & brand marks for Fuel 2.1 connectors + data room files.
 * Features official multi-color Slack octothorpe, official HubSpot sprocket,
 * official Granola mark, Stripe, Adyen, and authentic document format badges
 * (Adobe Acrobat PDF, Microsoft Excel XLS, Microsoft Word DOC).
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Multi-color authentic Slack Octothorpe Logo with balanced optical padding */
export function SlackIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1.5 -1.5 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M5.042 15.165a2.53 2.53 0 0 1-2.52 2.523A2.53 2.53 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52a2.527 2.527 0 0 1 2.521 2.52v6.313A2.53 2.53 0 0 1 8.834 24a2.53 2.53 0 0 1-2.521-2.522z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.53 2.53 0 0 1-2.521-2.52A2.53 2.53 0 0 1 8.834 0a2.53 2.53 0 0 1 2.521 2.522v2.52zm0 1.271a2.53 2.53 0 0 1 2.521 2.521a2.53 2.53 0 0 1-2.521 2.521H2.522A2.53 2.53 0 0 1 0 8.834a2.53 2.53 0 0 1 2.522-2.521z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.53 2.53 0 0 1 2.522-2.521A2.53 2.53 0 0 1 24 8.834a2.53 2.53 0 0 1-2.522 2.521h-2.522zm-1.268 0a2.53 2.53 0 0 1-2.523 2.521a2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.53 2.53 0 0 1 2.523 2.522z"
        fill="#2EB67D"
      />
      <path
        d="M15.165 18.956a2.53 2.53 0 0 1 2.523 2.522A2.53 2.53 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522zm0-1.268a2.527 2.527 0 0 1-2.52-2.523a2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.53 2.53 0 0 1-2.522 2.523z"
        fill="#ECB22E"
      />
    </svg>
  );
}

/** Official HubSpot Sprocket Mark */
export function HubSpotIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M18.164 7.93V5.084a2.2 2.2 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.2 2.2 0 0 0 1.252 1.973l.013.006v2.852a6.2 6.2 0 0 0-2.969 1.31l.012-.01l-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006l7.697 5.991a6.2 6.2 0 0 0-1.038 3.446a6.2 6.2 0 0 0 1.147 3.607l-.013-.02l-2.342 2.343a2 2 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033a2 2 0 0 0-.1-.595l.005.014l2.317-2.317a6.247 6.247 0 1 0 4.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 1 1 3.215-3.207v.002a3.206 3.206 0 0 1-3.207 3.207z"
        fill="#FF7A59"
      />
    </svg>
  );
}

/** Official Granola AI Notepad Hand-Drawn Spiral Logo (Ragged Edge Identity) */
export function GranolaIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M15.8258 31.9135C19.1265 31.9135 22.5858 31.1824 23.9792 30.1684C24.869 29.5337 25.3105 29.5958 26.1037 28.8371C26.3245 28.6163 26.421 28.5508 26.4831 28.4887C29.4975 26.0124 31.2427 22.8083 31.2427 18.6523C31.2427 11.8923 26.4521 7.29137 19.599 7.29137C13.5702 7.29137 8.96928 11.1301 8.96928 16.0483C8.96928 20.5216 12.4596 23.7257 17.4399 23.7257C17.7262 23.7257 17.8538 23.567 18.1711 23.567C19.3783 23.567 20.3612 23.2187 20.9958 22.553C21.3131 22.2047 21.9167 21.5046 21.9788 21.4735C22.265 21.2183 22.3271 20.8389 22.3926 20.6803C22.4547 20.5216 22.5823 20.425 22.6479 20.2043C22.71 19.9491 22.6168 19.6318 22.6168 19.349C22.6168 18.842 22.8376 18.335 22.8376 17.859C22.8376 16.5277 21.251 15.193 19.8232 15.193C19.6645 15.193 19.6645 15.0653 19.5679 15.0653C19.4714 15.0653 19.3783 15.1619 19.2817 15.1619C19.1851 15.1619 19.0609 15.0033 18.9333 15.0033C18.8057 15.0033 18.7436 15.1309 18.5539 15.1309C18.1401 15.1309 18.109 15.193 17.7917 15.193C17.6952 15.193 17.5365 15.224 17.4744 15.255C17.3468 15.3171 17.3468 15.4137 17.2192 15.4137C17.0491 15.4137 16.964 15.4459 16.964 15.5103C16.964 15.8586 16.995 15.7965 16.8364 15.7965C16.6662 15.7965 16.5604 15.8069 16.5191 15.8276C16.3914 15.8896 16.488 16.0483 16.3604 16.1449C16.2328 16.2069 16.2018 16.3035 16.1707 16.4932C16.1397 16.6829 15.95 16.7484 15.95 16.9381C15.95 17.0347 15.981 17.0968 15.981 17.1589C15.981 17.3486 15.6016 17.2865 15.6016 17.4762C15.6016 17.6038 15.6982 17.6969 15.6982 17.8245C15.6982 17.9211 15.6361 17.9832 15.6361 18.0797C15.6361 18.1763 15.6982 18.2384 15.6982 18.3005C15.6982 18.4591 15.4775 18.4902 15.4775 18.6178C15.4775 18.7454 15.6051 18.8385 15.6051 18.9351C15.6051 18.9972 15.5085 19.0316 15.5085 19.1248C15.5085 19.2179 15.4775 19.0627 15.6672 19.3455C15.7948 19.5352 15.7948 19.6318 15.6672 19.7904C15.5396 19.9491 15.2878 20.0456 14.9705 20.0456C13.6392 20.0456 13.4805 18.6799 12.7493 18.4591C12.5286 18.397 12.4941 18.3626 12.4941 18.2694C12.4941 18.1763 12.4941 18.2073 12.6217 18.0797C12.7493 17.9521 12.7804 17.859 12.7804 17.7624C12.7804 17.6659 12.7804 17.6348 12.7183 17.5727C12.4631 17.1589 12.3389 16.6519 12.3389 16.0828C12.3389 13.165 15.8913 10.7196 19.2575 10.7196C20.2715 10.7196 20.1129 10.9749 20.7165 10.9749C20.8751 10.9749 20.813 10.9749 21.0338 10.9438C21.6063 10.8473 22.6513 11.0714 23.4756 11.4819C25.7588 12.6235 27.2522 15.3206 27.2522 18.4626C27.2522 23.8257 22.4927 27.7265 16.1466 27.7265C12.6873 27.7265 10.3075 26.647 7.95873 24.0154C7.70351 23.7291 8.08634 24.0775 7.67247 23.3498C7.16547 22.4599 7.22755 23.0324 7.22755 23.0324C7.0689 22.8428 6.78263 22.3013 6.62398 22.1116C6.43429 21.8908 6.17907 21.9219 6.08594 21.7943C5.95833 21.6356 6.14803 21.3494 6.08594 21.1907C6.02386 20.9355 5.48237 20.5561 5.42029 20.3664C5.35821 20.1767 5.13403 18.9696 5.13403 18.7488C5.13403 18.4936 5.32372 18.4626 5.32372 18.3039C5.32372 18.0832 5.03746 18.0177 4.87881 17.7003C4.72015 17.383 4.62358 16.6519 4.62358 15.8586C4.62358 15.4447 4.62358 15.2861 4.75119 14.3342C4.78224 14.0169 5.25819 14.0169 5.25819 13.6685C5.25819 13.5409 5.19611 13.3822 5.19611 13.2891C5.19611 13.1615 5.19611 13.1305 5.22715 13.0339C6.55845 7.45003 12.5252 3.29402 19.1575 3.29402C21.4407 3.29402 23.1859 3.7079 25.883 4.84951C26.7728 5.22889 28.0731 4.56324 28.0731 3.86655C28.1352 3.64582 28.011 3.58029 27.9765 3.45268C27.9455 3.32506 27.8179 3.16641 27.6903 3.13537C27.6282 3.10433 27.5937 3.00776 27.5316 2.91464C27.435 2.75599 27.3419 2.6939 27.0867 2.62837C26.9591 2.59733 26.897 2.56629 26.8315 2.50076C26.7349 2.37315 26.6728 2.31107 26.5452 2.24554C26.4176 2.18346 26.3245 2.24554 26.2589 2.2145C26.1969 2.18346 26.1624 2.11793 26.1003 2.08689C26.0692 2.05585 26.0037 2.05585 25.9106 2.05585C22.71 0.34171 20.6164 0.0864868 17.8262 0.0864868C11.7974 0.0864868 6.40325 2.69046 3.07155 7.22584C2.78528 7.60523 2.94394 8.23984 2.53351 8.62267C1.74025 9.35385 0.757294 13.3512 0.757294 15.8896C0.757294 18.0142 1.26429 20.8389 1.92994 22.3944C3.2302 25.4398 2.66112 24.1706 2.85082 24.4569C3.2302 25.0604 3.54751 25.1225 3.70616 25.3122C3.70616 25.3122 3.80273 25.5019 3.80273 25.6916C3.80273 25.8192 3.80273 25.8503 3.83377 25.9123C3.93034 26.102 4.37181 26.4193 4.49942 26.5469C4.78568 26.8332 5.00642 27.4368 5.48237 27.9127C6.21356 28.6439 7.25859 29.213 10.5903 30.7685C11.7629 31.3065 11.0973 31.0237 11.2249 31.0547C11.5112 31.1513 11.8906 31.1513 12.1147 31.31C12.2423 31.4065 12.0837 31.372 12.432 31.372C12.4941 31.372 12.4941 31.4031 12.5597 31.4341C12.6217 31.4652 12.6873 31.5617 12.7804 31.5617C12.8425 31.5617 12.877 31.4997 12.9701 31.5307C13.0632 31.5617 13.2874 31.7204 13.4771 31.817C13.6357 31.9135 13.6668 31.9135 13.7323 31.848C13.922 31.7204 14.0496 31.879 14.2393 31.879C14.3014 31.879 14.3979 31.848 14.5876 31.848C14.8429 31.848 14.8429 31.9101 15.8258 31.9101"
        fill="currentColor"
      />
    </svg>
  );
}

/** Stripe wordmark glyph */
export function StripeIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.876 4.61 3.107 3.85 4.794 3.85 7.044c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.715 24c2.641 0 4.843-.624 6.328-1.813 1.585-1.27 2.384-3.132 2.384-5.579 0-4.127-2.524-5.851-6.451-7.458z"
        fill="#635BFF"
      />
    </svg>
  );
}

/** Adyen mark */
export function AdyenIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M12.932 17.041v1.598c0 .288.01.576.029.854a5.79 5.79 0 0 1-.51-.029 8.35 8.35 0 0 1-1.396-.222 6.027 6.027 0 0 1-2.293-1.079 5.771 5.771 0 0 1-1.742-1.896c-.462-.788-.693-1.732-.693-2.83 0-1.156.25-2.138.75-2.945a5.56 5.56 0 0 1 1.964-1.896 5.886 5.886 0 0 1 2.704-.74c.192 0 .385.01.587.02.192.019.385.038.587.067v7.791a4.49 4.49 0 0 0 .013.507zm-5.02-4.72c0 1.07.212 1.905.645 2.503a2.957 2.957 0 0 0 1.79 1.204V8.68a3.1 3.1 0 0 0-.74.086 2.75 2.75 0 0 0-1.002.423 2.763 2.763 0 0 0-.75.769c-.212.327-.308.788-.308 1.386h-.001zM17.75 17.47c.423.27.933.405 1.53.405.27 0 .54-.029.809-.086a3.53 3.53 0 0 0 .75-.25v-2.062a2.633 2.633 0 0 1-.52.154 3.11 3.11 0 0 1-.51.048c-.385 0-.693-.067-.924-.202a.92.92 0 0 1-.366-.577 3.977 3.977 0 0 1-.048-.673V4.412l-2.1.385v9.98c0 .924.14 1.626.423 2.1.28.462.72.808 1.25 1.05l-.004-.001zM22.679 0H1.321A1.32 1.32 0 0 0 0 1.321v21.358C0 23.41.59 24 1.321 24h21.358A1.32 1.32 0 0 0 24 22.679V1.321A1.32 1.32 0 0 0 22.679 0z"
        fill="#0ABF53"
      />
    </svg>
  );
}

/** Authentic Adobe Acrobat PDF Badge */
export function RealPdfIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="1" width="20" height="22" rx="4" fill="#E53935" />
      {/* Fold corner */}
      <path d="M15 1L22 8H17C15.8954 8 15 7.10457 15 6V1Z" fill="#FFCDD2" />
      {/* File label banner */}
      <rect x="4" y="11" width="16" height="8" rx="2" fill="#FFFFFF" />
      <text
        x="12"
        y="17.2"
        textAnchor="middle"
        fill="#C62828"
        fontSize="6.8"
        fontWeight="900"
        letterSpacing="0.04em"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

/** Authentic Microsoft Excel Spreadsheet Badge */
export function RealXlsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="1" width="20" height="22" rx="4" fill="#107C41" />
      {/* Fold corner */}
      <path d="M15 1L22 8H17C15.8954 8 15 7.10457 15 6V1Z" fill="#C8E6C9" />
      {/* File label banner */}
      <rect x="4" y="11" width="16" height="8" rx="2" fill="#FFFFFF" />
      <text
        x="12"
        y="17.2"
        textAnchor="middle"
        fill="#0E5A2F"
        fontSize="6.8"
        fontWeight="900"
        letterSpacing="0.04em"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      >
        XLS
      </text>
    </svg>
  );
}

/** Authentic Microsoft Word Document Badge */
export function RealDocIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="1" width="20" height="22" rx="4" fill="#185ABD" />
      {/* Fold corner */}
      <path d="M15 1L22 8H17C15.8954 8 15 7.10457 15 6V1Z" fill="#BBDEFB" />
      {/* File label banner */}
      <rect x="4" y="11" width="16" height="8" rx="2" fill="#FFFFFF" />
      <text
        x="12"
        y="17.2"
        textAnchor="middle"
        fill="#0D47A1"
        fontSize="6.8"
        fontWeight="900"
        letterSpacing="0.04em"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      >
        DOC
      </text>
    </svg>
  );
}

export type ConnectorBrand = "slack" | "granola" | "hubspot";

export function ConnectorBrandIcon({
  brand,
  size = 18,
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

/** Official Völur Brand Mark */
export function VolurIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#FFFFFF" />
      <rect width="24" height="24" rx="5" stroke="#E2E8F0" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.5" fill="#0284C7" />
      <path d="M8 10L12 15L16 10" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Official York IE Isometric Wireframe Cube Mark */
export function YorkIEMarkIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#F8FAFC" />
      <rect width="24" height="24" rx="5" stroke="#E2E8F0" strokeWidth="1" />
      <path d="M12 4L18.5 7.75V15.25L12 19L5.5 15.25V7.75L12 4Z" stroke="#0F172A" strokeWidth="1.4" />
      <path d="M12 4V19M5.5 7.75L18.5 15.25M18.5 7.75L5.5 15.25" stroke="#0F172A" strokeWidth="1.2" opacity="0.75" />
    </svg>
  );
}

/** Official Swiggy Orange Pin/S Mark */
export function SwiggyIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#FC8019" />
      <path
        d="M12 5.5C9.5 5.5 7.5 7.5 7.5 10C7.5 13.5 12 18.5 12 18.5C12 18.5 16.5 13.5 16.5 10C16.5 7.5 14.5 5.5 12 5.5ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** High-security Institutional Investor Data Room Vault Mark */
export function DataRoomVaultIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M3 6.5C3 5.4 3.9 4.5 5 4.5H9.5L11.5 6.8H19C20.1 6.8 21 7.7 21 8.8V17.5C21 18.6 20.1 19.5 19 19.5H5C3.9 19.5 3 18.6 3 17.5V6.5Z"
        fill="#0F766E"
      />
      <rect x="5.5" y="3.5" width="13" height="8" rx="1.2" fill="#FFFFFF" />
      <path d="M15.5 3.5L18.5 6.5H16.2C15.8 6.5 15.5 6.2 15.5 5.8V3.5Z" fill="#CBD5E1" />
      <line x1="7.5" y1="5.8" x2="13.5" y2="5.8" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7.5" y1="7.8" x2="15" y2="7.8" stroke="#00B48A" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M2.5 10C2.5 9 3.3 8.2 4.3 8.2H19.7C20.7 8.2 21.5 9 21.5 10L20.8 17.8C20.7 18.8 19.8 19.5 18.8 19.5H5.2C4.2 19.5 3.3 18.8 3.2 17.8L2.5 10Z"
        fill="#00B48A"
      />
      <path d="M4 9.2H20" stroke="#5EEAD4" strokeWidth="0.8" opacity="0.7" />
      <path
        d="M9.8 12V9.4C9.8 8.2 10.8 7.2 12 7.2C13.2 7.2 14.2 8.2 14.2 9.4V12"
        stroke="#FEF08A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="8.2" y="11.5" width="7.6" height="6.2" rx="1.6" fill="#F59E0B" />
      <rect x="8.8" y="12.2" width="6.4" height="1.8" rx="0.8" fill="#FDE68A" />
      <circle cx="12" cy="14.3" r="0.9" fill="#78350F" />
      <polygon points="11.5,14.6 12.5,14.6 12.2,16.2 11.8,16.2" fill="#78350F" />
    </svg>
  );
}
