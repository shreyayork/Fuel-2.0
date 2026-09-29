"use client";

import Script from "next/script";

type Props = {
  projectId: string;
  email?: string;
  fullName?: string;
};

/**
 * Official Marker.io snippet loader. Renders nothing when `projectId` is empty
 * so local/dev stay off unless MARKER_IO_PROJECT_ID is set.
 * Duplicate init guarded by Marker’s own `e.__Marker` check + stable Script id.
 */
export function MarkerIo({ projectId, email, fullName }: Props) {
  if (!projectId) return null;

  const config: {
    project: string;
    source: "snippet";
    reporter?: { email: string; fullName?: string };
  } = {
    project: projectId,
    source: "snippet",
  };

  if (email) {
    config.reporter = fullName ? { email, fullName } : { email };
  }

  // Official Marker.io snippet — project/reporter injected from props (env-gated).
  const bootstrap = `window.markerConfig=${JSON.stringify(config)};
!function(e,r,a){if(!e.__Marker){e.__Marker={};var t=[],n={__cs:t};["show","hide","isVisible","capture","cancelCapture","unload","reload","isExtensionInstalled","setReporter","clearReporter","setCustomData","on","off"].forEach(function(e){n[e]=function(){var r=Array.prototype.slice.call(arguments);r.unshift(e),t.push(r)}}),e.Marker=n;var s=r.createElement("script");s.async=1,s.src="https://edge.marker.io/latest/shim.js";var i=r.getElementsByTagName("script")[0];i.parentNode.insertBefore(s,i)}}(window,document);`;

  return (
    <Script
      id="marker-io"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}
