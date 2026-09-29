import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  companies,
  people,
  initiatives,
  initiativeTeam,
  fixtureSignals,
  benchmarks,
} from "./schema";
import type { Company, Initiative, Person, FixtureSignal, Benchmark } from "./schema";

export type FuelDataset = {
  companies: Company[];
  people: Person[];
  initiatives: (Initiative & { team: number[] })[];
  signalsByCompany: Record<number, Pick<FixtureSignal, "at" | "kind" | "text">[]>;
  benchmarks: Benchmark[];
};

/** Deduped per-request via React.cache — layout + page fetch once each. */
export const loadDataset = cache(_loadDataset);

async function _loadDataset(): Promise<FuelDataset> {
  const db = await getDb();
  const [cos, ppl, inits, sigs, bms, teamRows] = await Promise.all([
    db.select().from(companies).orderBy(companies.id),
    db.select().from(people).orderBy(people.id),
    db.select().from(initiatives).orderBy(initiatives.id),
    db.select().from(fixtureSignals).orderBy(fixtureSignals.id),
    db.select().from(benchmarks).orderBy(benchmarks.id),
    db.select().from(initiativeTeam),
  ]);

  const teamByInitiative = new Map<number, number[]>();
  for (const r of teamRows) {
    const arr = teamByInitiative.get(r.initiativeId) ?? [];
    arr.push(r.personId);
    teamByInitiative.set(r.initiativeId, arr);
  }

  const signalsByCompany: FuelDataset["signalsByCompany"] = {};
  for (const s of sigs) {
    (signalsByCompany[s.companyId] ??= []).push({ at: s.at, kind: s.kind, text: s.text });
  }

  return {
    companies: cos,
    people: ppl,
    initiatives: inits.map((i) => ({ ...i, team: teamByInitiative.get(i.id) ?? [i.ownerId] })),
    signalsByCompany,
    benchmarks: bms,
  };
}

export async function companyById(id: number): Promise<Company | null> {
  const db = await getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, id));
  return row ?? null;
}
