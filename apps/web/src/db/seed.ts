import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, getPool } from "./client";
import {
  companies,
  people,
  initiatives,
  initiativeTeam,
  fixtureSignals,
  benchmarks,
} from "./schema";
import { fixture } from "./fixture";

async function main() {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE
        ${initiativeTeam}, ${fixtureSignals}, ${initiatives}, ${benchmarks}, ${companies}, ${people}
        RESTART IDENTITY CASCADE`,
    );

    await tx.insert(people).values(
      fixture.people.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        role: p.role,
        team: p.team,
        focus: p.focus,
      })),
    );

    await tx.insert(companies).values(
      fixture.companies.map((c) => ({
        id: c.id,
        name: c.name,
        logo: c.logo,
        stage: c.stage,
        industry: c.industry,
        list: c.list,
        type: c.type,
        arr: c.arr,
        arrGrowth: c.arrGrowth,
        burn: "burn" in c ? c.burn : null,
        runway: "runway" in c ? c.runway : null,
        nrr: c.nrr,
        fitScore: c.fitScore,
        hq: "hq" in c ? c.hq : null,
        founded: "founded" in c ? c.founded : null,
        employees: "employees" in c ? c.employees : null,
        raising: "raising" in c ? !!c.raising : false,
        targetRound: "targetRound" in c ? c.targetRound : null,
        hubspotStage: "hubspotStage" in c ? c.hubspotStage : null,
        hubspotId: "hubspotId" in c ? c.hubspotId : null,
        hubspotOwner: "hubspotOwner" in c ? c.hubspotOwner : null,
      })),
    );

    await tx.insert(initiatives).values(
      fixture.initiatives.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        kind: e.kind,
        name: e.name,
        area: e.area,
        health: "health" in e ? e.health : null,
        automation: "automation" in e ? e.automation : null,
        since: "since" in e ? e.since : null,
        value: "value" in e ? e.value : null,
        signal: "signal" in e ? ([...e.signal] as number[]) : null,
        pct: "pct" in e ? e.pct : null,
        due: "due" in e ? e.due : null,
        ownerId: e.ownerId,
      })),
    );

    const teamRows = fixture.initiatives.flatMap((e) =>
      (e.team ?? [e.ownerId]).map((personId) => ({
        initiativeId: e.id,
        personId,
      })),
    );
    if (teamRows.length) await tx.insert(initiativeTeam).values(teamRows);

    await tx.insert(fixtureSignals).values(
      fixture.signals.map((s) => ({
        companyId: s.companyId,
        at: s.at,
        kind: s.kind,
        text: s.text,
      })),
    );

    await tx.insert(benchmarks).values(fixture.benchmarks.map((b) => ({ ...b })));
  });

  const pool = await getPool();
  await pool.end();
  console.log(
    `seeded: ${fixture.companies.length} companies, ${fixture.people.length} people, ${fixture.initiatives.length} initiatives, ${fixture.signals.length} signals, ${fixture.benchmarks.length} benchmarks`,
  );
  console.log(
    "Note: system / global playbooks + cohorts seed via db:seed:libs (also chained from npm run db:seed).",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
