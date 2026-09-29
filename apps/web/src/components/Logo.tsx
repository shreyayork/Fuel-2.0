"use client";

import { useEffect, useRef, useState } from "react";
import { resolveCompanyLogoUrl } from "@/lib/company-logo";
import { onAccentText, THEMES, type Theme } from "@/lib/theme";

/** White logo plate — editorial `panel` is the theme white surface token. */
const LOGO_SURFACE = THEMES.editorial.panel;

const LOGO_TINTS = [
  { bg: "#2B3E52", fg: "#CBE5DC" },
  { bg: "#1F4B47", fg: "#E6E0A8" },
  { bg: "#3F2F3D", fg: "#F2C9B1" },
  { bg: "#2F3A2A", fg: "#D6E3AE" },
  { bg: "#24314B", fg: "#A7C6F0" },
  { bg: "#4B3430", fg: "#F3C7A8" },
  { bg: "#2B3F3C", fg: "#B6D9BF" },
];

function tintForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LOGO_TINTS[h % LOGO_TINTS.length];
}

function resolveLogoSrc(co: {
  uuid?: string | null;
  logoUrl?: string | null;
}): string | null {
  return resolveCompanyLogoUrl(co.uuid, co.logoUrl) ?? null;
}

function isUsableBitmap(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalHeight > 0;
}

/**
 * Exactly one of {image, initials} — never both.
 * Image wins only after a successful load for the current `src`
 * (broken/404/`onError` leave `loadedSrc` null → initials fallback).
 */
export function logoMarkMode(
  src: string | null,
  loadedSrc: string | null,
): "image" | "initials" {
  return src && loadedSrc === src ? "image" : "initials";
}

/**
 * Company mark: show logo when a URL loads; otherwise initials on tint/accent.
 *
 * `loadedSrc === src` gates visibility in React state so parent re-renders cannot
 * wipe a successful load (imperative opacity + style={{opacity:0}} did that).
 * Initials unmount once the image is shown — leaving them under a transparent
 * `object-fit: contain` logo made both visible at once.
 */
export function Logo({
  t,
  co,
  size = 36,
  fallbackTone = "tint",
}: {
  t: Theme;
  co: { logo: string; name?: string; uuid?: string | null; logoUrl?: string | null };
  size?: number;
  /** When no image loads, "accent" uses Ask Fuel green (`t.accent`). */
  fallbackTone?: "tint" | "accent";
}) {
  const isDark = t.mode === "signal";
  const tint = tintForName(co.name ?? co.logo);
  const lightBg = `color-mix(in oklab, ${tint.bg} 8%, ${LOGO_SURFACE})`;
  const useAccent = fallbackTone === "accent";
  const fallbackBackground = useAccent ? t.accent : isDark ? tint.bg : lightBg;
  const color = useAccent ? onAccentText(t) : isDark ? tint.fg : tint.bg;
  const src = resolveLogoSrc(co);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const mode = logoMarkMode(src, loadedSrc);
  const showImage = mode === "image";
  const background = showImage ? LOGO_SURFACE : fallbackBackground;

  useEffect(() => {
    const img = imgRef.current;
    if (!src || !img) return;
    // Cached decode may finish before onLoad is attached.
    if (img.complete) {
      setLoadedSrc(isUsableBitmap(img) ? src : null);
    }
  }, [src]);

  return (
    <div
      data-logo-mode={mode}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        background,
        border: showImage || !(useAccent || isDark) ? `1px solid ${t.rule}` : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: t.sans,
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
        color,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        boxShadow: !showImage && !useAccent && isDark ? "inset 0 -1px 0 rgba(255,255,255,0.05)" : "none",
      }}
    >
      {!showImage ? <span aria-hidden>{co.logo}</span> : null}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote company logos; next/image not wired for arbitrary CDN hosts
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={co.name ?? co.logo}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            setLoadedSrc(isUsableBitmap(e.currentTarget) ? src : null);
          }}
          onError={() => {
            setLoadedSrc(null);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: size * 0.1,
            opacity: showImage ? 1 : 0,
          }}
        />
      ) : null}
    </div>
  );
}
