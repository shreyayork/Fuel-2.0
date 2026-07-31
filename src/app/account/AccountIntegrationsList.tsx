import React, { useState } from "react";
import "./accountSettings.css";
import hubspotIcon from "../../assets/icons/hubspot-connector.svg";
import granolaIcon from "../../assets/icons/granola-connector.svg";

export type AccountIntegrationId = "hubspot" | "granola";

export type AccountIntegration = {
  id: AccountIntegrationId;
  name: string;
  tags: string[];
  description: string;
  /** Coming-soon rows have no Connect CTA. */
  soon?: boolean;
};

/**
 * Account connectors — HubSpot + Granola only (Settings + Overview).
 * Assumption: overview uses a short value-first intro; Settings keeps the parent `intro` prop.
 */
export const ACCOUNT_INTEGRATIONS: AccountIntegration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    tags: ["crm"],
    description: "Sync CRM, deals, and engagement data.",
  },
  {
    id: "granola",
    name: "Granola",
    tags: ["meetings"],
    description: "Automate note capture from meetings.",
  },
];

const INTEGRATION_ICONS: Record<AccountIntegrationId, string> = {
  hubspot: hubspotIcon,
  granola: granolaIcon,
};

/** Preview-only mock store — live OAuth belongs in backend lock. */
const connectedStore = new Set<AccountIntegrationId>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function useConnectedIntegrations() {
  const [, setTick] = useState(0);

  React.useEffect(() => {
    const listener = () => setTick(n => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return connectedStore;
}

export function AccountIntegrationsList({
  heading = "Integrations",
  intro,
  compactStrip = false,
  gateLayout = false,
}: {
  heading?: string;
  intro?: string;
  /** Overview bottom strip — icon row only, no card grid. */
  compactStrip?: boolean;
  /** Profile gate card grid — same connectors block as Old design overview. */
  gateLayout?: boolean;
}) {
  const connected = useConnectedIntegrations();
  const [connectingId, setConnectingId] = useState<AccountIntegrationId | null>(null);
  const isGateOverview = gateLayout;
  const isOverviewVariant = !compactStrip && !gateLayout && heading.trim().toLowerCase() === "connectors";
  const useOverviewCards = isOverviewVariant || isGateOverview;
  const connectedCount = ACCOUNT_INTEGRATIONS.filter(item => connected.has(item.id)).length;

  function connectIntegration(id: AccountIntegrationId) {
    if (connectingId) return;
    setConnectingId(id);
    // Preview mock connect — no real OAuth in preview workspaces.
    window.setTimeout(() => {
      connectedStore.add(id);
      setConnectingId(null);
      notifyListeners();
    }, 700);
  }

  function disconnectIntegration(id: AccountIntegrationId) {
    connectedStore.delete(id);
    notifyListeners();
  }

  return (
    <section
      className={`acct-integrations${compactStrip ? " acct-integrations--strip" : useOverviewCards ? " acct-integrations--overview" : ""}`}
      aria-labelledby="acct-integrations-heading"
    >
      {!compactStrip ? (
      <div className="acct-integrations-head">
        <div className="acct-integrations-head-main">
          {useOverviewCards ? (
            <span className="acct-integrations-mark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.2 3.2 4.4 5a2.6 2.6 0 0 0 3.7 3.7l.7-.7M9.8 12.8 11.6 11a2.6 2.6 0 0 0-3.7-3.7l-.7.7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ) : null}
          <div className="acct-integrations-head-copy">
            <h2 id="acct-integrations-heading" className="acct-integrations-title">
              {useOverviewCards ? "Connect your tools" : heading}
            </h2>
            {useOverviewCards ? (
              <p className="acct-integrations-intro">
                {intro?.trim() || "Connect data sources to auto-enrich your profile and unlock deeper AI insights."}
              </p>
            ) : intro ? (
              <p className="acct-integrations-intro">{intro}</p>
            ) : null}
          </div>
        </div>
        {useOverviewCards ? (
          <span
            className={`acct-integrations-status${connectedCount === ACCOUNT_INTEGRATIONS.length ? " is-complete" : ""}`}
            aria-live="polite"
          >
            {connectedCount}/{ACCOUNT_INTEGRATIONS.length} linked
          </span>
        ) : null}
      </div>
      ) : null}

      <ul className="acct-integrations-list">
        {ACCOUNT_INTEGRATIONS.map(integration => {
          const isConnected = connected.has(integration.id);
          const isConnecting = connectingId === integration.id;

          return (
            <li
              key={integration.id}
              className={`acct-integration-row${integration.soon ? " is-soon" : ""}${isConnected ? " is-connected" : ""}`}
            >
              <div className={`acct-integration-logo-wrap acct-integration-logo-wrap--${integration.id}`}>
                <img
                  src={INTEGRATION_ICONS[integration.id]}
                  alt=""
                  aria-hidden="true"
                  className="acct-integration-logo"
                />
              </div>
              {!compactStrip ? (
              <div className="acct-integration-copy">
                <div className="acct-integration-name-row">
                  <strong className="acct-integration-name">{integration.name}</strong>
                  {!useOverviewCards
                    ? integration.tags.map(tag => (
                        <span key={tag} className={`acct-integration-tag${tag === "soon" ? " is-soon" : ""}`}>
                          {tag}
                        </span>
                      ))
                    : null}
                  {useOverviewCards && isConnected ? (
                    <span className="acct-integration-live-pill">Linked</span>
                  ) : null}
                </div>
                <p className="acct-integration-desc">{integration.description}</p>
                {useOverviewCards && !integration.soon ? (
                  isConnected ? (
                    <button
                      type="button"
                      className="acct-integration-link-cta is-connected"
                      onClick={() => disconnectIntegration(integration.id)}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="acct-integration-link-cta"
                      disabled={isConnecting}
                      onClick={() => connectIntegration(integration.id)}
                    >
                      {isConnecting ? "Connecting…" : "Connect →"}
                    </button>
                  )
                ) : null}
              </div>
              ) : (
                <div className="acct-integration-strip-copy">
                  <strong className="acct-integration-name">{integration.name}</strong>
                  {!integration.soon ? (
                    isConnected ? (
                      <button
                        type="button"
                        className="acct-integration-link-cta is-connected"
                        onClick={() => disconnectIntegration(integration.id)}
                      >
                        Linked
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="acct-integration-link-cta"
                        disabled={isConnecting}
                        onClick={() => connectIntegration(integration.id)}
                      >
                        {isConnecting ? "…" : "Connect"}
                      </button>
                    )
                  ) : null}
                </div>
              )}

              {!useOverviewCards && !integration.soon ? (
                isConnected ? (
                  <button
                    type="button"
                    className="acct-integration-connect is-connected"
                    onClick={() => disconnectIntegration(integration.id)}
                  >
                    Connected
                  </button>
                ) : (
                  <button
                    type="button"
                    className="acct-integration-connect"
                    disabled={isConnecting}
                    onClick={() => connectIntegration(integration.id)}
                  >
                    {isConnecting ? "Connecting…" : "Connect"}
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
