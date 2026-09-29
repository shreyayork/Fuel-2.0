"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { THEMES, type ThemeMode } from "@/lib/theme";
import type { Company, FuelDataset } from "@/lib/types";
import { Shell } from "./Shell";
import { PortfolioView } from "./views/PortfolioView";
import { PipelineView } from "./views/PipelineView";
import { InitiativesView } from "./views/InitiativesView";
import { BenchmarksView } from "./views/BenchmarksView";
import { PeopleView } from "./views/PeopleView";
import { CompanyProfile } from "./views/CompanyProfile";

const Placeholder = ({ label, color, font }: { label: string; color: string; font: string }) => (
  <div
    style={{
      padding: 40,
      textAlign: "center",
      color,
      fontFamily: font,
      fontSize: 11,
      letterSpacing: "0.14em",
    }}
  >
    {label}
  </div>
);

function usePersistentState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setValue(stored as T);
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}

export function FuelApp({ data }: { data: FuelDataset }) {
  const params = useSearchParams();
  const [mode, setMode] = usePersistentState<ThemeMode>("fuel:theme", "signal");
  const [page, setPage] = usePersistentState<string>("fuel:page", "pipeline");
  const [openCo, setOpenCo] = useState<Company | null>(null);

  // Let other routes deep-link into a specific nav page or opened company.
  useEffect(() => {
    const p = params.get("page");
    if (p) {
      setPage(p);
      setOpenCo(null);
      return;
    }
    const openCoId = params.get("openCoId");
    if (openCoId) {
      const co = data.companies.find((c) => String(c.id) === openCoId);
      if (co) setOpenCo(co);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const t = { ...THEMES[mode], mode };

  const pmPages: Record<string, { eyebrow: string; render: () => React.ReactNode }> = {
    pipeline: {
      eyebrow: "Pipeline",
      render: () => <PipelineView t={t} data={data} onOpenCo={setOpenCo} />,
    },
    engage: {
      eyebrow: "Initiatives",
      render: () => <InitiativesView t={t} data={data} onOpenCo={setOpenCo} />,
    },
    benchmarks: {
      eyebrow: "Benchmarking",
      render: () => <BenchmarksView t={t} data={data} />,
    },
    advisors: { eyebrow: "Advisors", render: () => <PeopleView t={t} data={data} /> },
    providers: { eyebrow: "Providers", render: () => <PeopleView t={t} data={data} /> },
    investors: { eyebrow: "Investors", render: () => <PeopleView t={t} data={data} /> },
    playbooks: {
      eyebrow: "Playbooks",
      render: () => <Placeholder label="PLAYBOOKS · LIBRARY VIEW" color={t.muted} font={t.mono} />,
    },
  };

  const cur = pmPages[page] ?? pmPages["pipeline"];
  const body = openCo ? (
    <CompanyProfile t={t} co={openCo} data={data} onBack={() => setOpenCo(null)} />
  ) : (
    cur?.render()
  );
  const eyebrow = openCo ? openCo.name : cur?.eyebrow;

  return (
    <Shell
      t={t}
      mode={mode}
      setMode={setMode}
      page={page}
      setPage={(p) => {
        setOpenCo(null);
        setPage(p);
      }}
      eyebrow={eyebrow}
      data={data}
      onOpenCo={setOpenCo}
    >
      {body}
    </Shell>
  );
}
