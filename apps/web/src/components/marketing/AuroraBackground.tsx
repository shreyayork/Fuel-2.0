"use client";

/**
 * Ambient drifting-gradient backdrop. Sits behind the hero (and only the
 * hero) to give the page its sense of depth + motion without taking
 * attention from the headline. Two large radial blobs + a thin grid mesh
 * + a noise overlay — all CSS, no JS animation loop.
 *
 * The blobs animate via `@keyframes` so it's free to compute and survives
 * SSR. The mesh and noise are static SVG data URIs so there's no extra
 * network roundtrip.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        // Mask the bottom so the aurora fades into the page chrome below.
        maskImage:
          "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
      }}
    >
      <style>{`
        @keyframes fuel-aurora-a {
          0%   { transform: translate3d(-10%, -10%, 0) scale(1.05); opacity: 0.7; }
          50%  { transform: translate3d(10%, 5%, 0) scale(1.15);   opacity: 0.95; }
          100% { transform: translate3d(-10%, -10%, 0) scale(1.05); opacity: 0.7; }
        }
        @keyframes fuel-aurora-b {
          0%   { transform: translate3d(15%, 10%, 0) scale(1.1); opacity: 0.55; }
          50%  { transform: translate3d(-5%, -10%, 0) scale(1.0); opacity: 0.85; }
          100% { transform: translate3d(15%, 10%, 0) scale(1.1); opacity: 0.55; }
        }
        @keyframes fuel-aurora-c {
          0%   { transform: translate3d(0%, 20%, 0) scale(0.95); opacity: 0.4; }
          50%  { transform: translate3d(-15%, -5%, 0) scale(1.1); opacity: 0.65; }
          100% { transform: translate3d(0%, 20%, 0) scale(0.95); opacity: 0.4; }
        }
      `}</style>

      {/* Teal blob, top-left */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "70vw",
          height: "70vw",
          maxWidth: 1100,
          maxHeight: 1100,
          background:
            "radial-gradient(closest-side, rgba(0,180,138,0.35), rgba(0,180,138,0) 70%)",
          filter: "blur(40px)",
          animation: "fuel-aurora-a 18s ease-in-out infinite",
        }}
      />

      {/* Navy-violet blob, top-right */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-15%",
          width: "60vw",
          height: "60vw",
          maxWidth: 900,
          maxHeight: 900,
          background:
            "radial-gradient(closest-side, rgba(63,116,178,0.40), rgba(63,116,178,0) 70%)",
          filter: "blur(50px)",
          animation: "fuel-aurora-b 22s ease-in-out infinite",
        }}
      />

      {/* Gold whisper, bottom-center */}
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "30%",
          width: "50vw",
          height: "50vw",
          maxWidth: 800,
          maxHeight: 800,
          background:
            "radial-gradient(closest-side, rgba(236,214,127,0.18), rgba(236,214,127,0) 70%)",
          filter: "blur(60px)",
          animation: "fuel-aurora-c 26s ease-in-out infinite",
        }}
      />

      {/* Fine grid mesh — gives the surface scale + a "data" feel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(244,246,248,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(244,246,248,0.045) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at center top, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center top, black 0%, transparent 70%)",
        }}
      />

      {/* Faint noise grain so the gradient doesn't band on big monitors */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
