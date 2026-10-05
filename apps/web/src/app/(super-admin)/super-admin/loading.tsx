import { SIGNAL } from "@/lib/theme";

/**
 * Instant feedback while force-dynamic Super Admin RSC loads.
 * Keeps the first click from feeling like a dead tap.
 */
export default function SuperAdminLoading() {
  return (
    <div
      style={{
        alignItems: "center",
        color: SIGNAL.muted,
        display: "flex",
        fontFamily: SIGNAL.sans,
        fontSize: 13,
        justifyContent: "center",
        minHeight: 240,
        padding: 32,
      }}
    >
      Loading…
    </div>
  );
}
