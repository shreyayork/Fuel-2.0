"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../ThemeContext";
import { WatchlistsView } from "./WatchlistsView";
import type { WatchlistListItem } from "@/lib/watchlists";
import type { TeamAccessOption } from "./watchlist-access-ui";
import {
  PORTFOLIO_BUILD_MIN_MS,
  PortfolioBuildPanel,
  usePortfolioBuildPhase,
} from "./PortfolioBuildPanel";
import { ensureInvestorPortfoliosAction } from "@/app/(app)/portfolio/actions";
import {
  portfolioBuildPlayedKey,
  shouldPlayPortfolioBuild,
} from "@/lib/portfolio/portfolio-build-session";

function readBuildPlayed(accountId: string, firmName: string): string | null {
  try {
    return sessionStorage.getItem(portfolioBuildPlayedKey(accountId, firmName));
  } catch {
    return null;
  }
}

export function ThemedWatchlistsView({
  watchlists,
  userEmail,
  scope,
  kind,
  availableTeams = [],
  firmName = "",
  accountId = "",
}: {
  watchlists: WatchlistListItem[];
  userEmail: string;
  scope: "all" | "mine" | "shared" | "starred";
  kind: "portfolio" | "watchlist";
  availableTeams?: TeamAccessOption[];
  firmName?: string;
  /** Scopes the build animation so a later claim in this browser still plays. */
  accountId?: string;
}) {
  const t = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstLanding =
    kind === "portfolio" && searchParams.get("first") === "1";

  // Sync init — useEffect-only left first paint on empty WatchlistsView and
  // users often never saw "Building your Portfolios".
  const [building, setBuilding] = useState(() =>
    shouldPlayPortfolioBuild({
      kind,
      firstLanding,
      stored: readBuildPlayed(accountId, firmName),
    }),
  );
  const [, startEnsure] = useTransition();
  const phase = usePortfolioBuildPhase(building);

  useEffect(() => {
    if (kind !== "portfolio") return;
    if (
      !shouldPlayPortfolioBuild({
        kind,
        firstLanding,
        stored: readBuildPlayed(accountId, firmName),
      })
    ) {
      return;
    }

    const playedKey = portfolioBuildPlayedKey(accountId, firmName);

    setBuilding(true);
    const started = Date.now();

    startEnsure(async () => {
      try {
        await ensureInvestorPortfoliosAction(firmName);
      } catch {
        /* empty table OK */
      }
      const wait = Math.max(0, PORTFOLIO_BUILD_MIN_MS - (Date.now() - started));
      window.setTimeout(() => {
        try {
          sessionStorage.setItem(playedKey, "1");
        } catch {
          /* ignore */
        }
        setBuilding(false);
        router.refresh();
        const url = new URL(window.location.href);
        url.searchParams.delete("first");
        window.history.replaceState({}, "", url.toString());
      }, wait);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on first landing
  }, []);

  if (kind === "portfolio" && building) {
    return <PortfolioBuildPanel t={t} phase={phase} />;
  }

  return (
    <WatchlistsView
      t={t}
      watchlists={watchlists}
      userEmail={userEmail}
      scope={scope}
      kind={kind}
      availableTeams={availableTeams}
    />
  );
}
