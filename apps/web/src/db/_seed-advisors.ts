import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { advisors } from "./schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * One-off import for /Users/mike/Downloads/Advisor Contacts - Sheet1.csv.
 *
 * Cleans whitespace, normalizes casing, splits multi-value fields, drops
 * "Partner" rows (they belong in the forthcoming Service Providers section,
 * not Advisors). Idempotent via a (accountId, linkedinUrl || email || name)
 * lookup — re-runs won't duplicate rows.
 *
 * Run: `cd apps/web && npx tsx src/db/_seed-advisors.ts [--dry]`
 *   --dry (default): print cleaned JSON, insert nothing
 *   --apply:         insert into the york-ie account
 */

const CSV_PATH = "/Users/mike/Downloads/Advisor Contacts - Sheet1.csv";
const ACCOUNT_ID = "york-ie";
const CURATED_BY = "mike@york.ie";

interface Row {
  firstName: string;
  lastName: string;
  title: string;
  type: string;
  linkedin: string;
  company: string;
  companyUrl: string;
  education: string;
  experience: string;
  location: string;
  email: string;
  industry: string;
  stage: string;
  expertise: string;
}

function parseCsv(text: string): Row[] {
  const lines = splitCsvLines(text);
  // skip header
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    // pad to 14 columns
    while (cells.length < 14) cells.push("");
    rows.push({
      firstName: cells[0],
      lastName: cells[1],
      title: cells[2],
      type: cells[3],
      linkedin: cells[4],
      company: cells[5],
      companyUrl: cells[6],
      education: cells[7],
      experience: cells[8],
      location: cells[9],
      email: cells[10],
      industry: cells[11],
      stage: cells[12],
      expertise: cells[13],
    });
  }
  return rows;
}

/** Split a CSV into logical lines, honoring quoted newlines (none here, but safe). */
function splitCsvLines(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    if (c === "\n" && !inQuotes) {
      out.push(buf);
      buf = "";
      continue;
    }
    if (c === "\r") continue;
    buf += c;
  }
  if (buf) out.push(buf);
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out;
}

function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function tidyList(s: string): string {
  // Trim + strip trailing commas/semicolons that came from half-filled CSV cells.
  return tidy(s).replace(/[,;\s]+$/, "");
}

function tidyTags(raw: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => tidy(t))
        .filter(Boolean),
    ),
  );
}

interface CleanedAdvisor {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  location: string | null;
  bio: string | null;
  expertise: string[] | null;
  focusIndustries: string[] | null;
  // not inserted — diagnostic only
  _rawType: string;
  _skipped?: string;
}

function clean(row: Row): CleanedAdvisor {
  const first = tidy(row.firstName);
  const last = tidy(row.lastName);
  const name = [first, last].filter(Boolean).join(" ").trim();

  // Glitch fix: Eric-Jan Schmidt's Company has a doubled prefix.
  let company = tidy(row.company) || null;
  if (company && /^(CMO & Principal\s+)+/.test(company)) {
    company = company.replace(/^(CMO & Principal\s+)+/, "").trim() || null;
  }

  const industries = tidyTags(row.industry);
  const stages = tidyTags(row.stage).map(normalizeStage);
  const focusIndustries = Array.from(new Set([...industries, ...stages]));
  const expertise = tidyTags(row.expertise);

  // Fix typo reported earlier + strip trailing comma litter.
  const experience = tidyList(row.experience).replace(/\bSouthnern\b/g, "Southern");
  const education = tidyList(row.education);
  const bioParts: string[] = [];
  if (education) bioParts.push(`**Education:** ${education}`);
  if (experience) bioParts.push(`**Experience:** ${experience}`);
  const bio = bioParts.length ? bioParts.join("\n\n") : null;

  const email = tidy(row.email).toLowerCase() || null;
  const linkedin = tidy(row.linkedin) || null;
  const location = tidy(row.location) || null;
  const title = tidy(row.title) || null;
  const type = tidy(row.type) || "Advisor"; // blank type = advisor by default

  // Stable id derived from linkedin > email > name — lets reruns upsert.
  const keyBasis = (linkedin ?? email ?? name).toLowerCase();
  const hash = createHash("sha256").update(keyBasis).digest("hex").slice(0, 20);
  const id = `adv_${hash}`;

  const cleaned: CleanedAdvisor = {
    id,
    name,
    title,
    company,
    email,
    linkedinUrl: linkedin,
    location,
    bio,
    expertise: expertise.length ? expertise : null,
    focusIndustries: focusIndustries.length ? focusIndustries : null,
    _rawType: type,
  };

  if (/^partner$/i.test(type)) {
    cleaned._skipped =
      "Type=Partner → service-provider contact; defer to Phase 3 (service_providers).";
  } else if (!name) {
    cleaned._skipped = "No name.";
  }
  return cleaned;
}

function normalizeStage(s: string): string {
  const x = s.toLowerCase();
  if (/^growth( stage)?$/.test(x)) return "growth";
  if (/^later stage$/.test(x)) return "later-stage";
  if (/^early stage$/.test(x)) return "early-stage";
  if (/^seed$/.test(x)) return "seed";
  if (/^series ?a$/.test(x)) return "series-a";
  if (/^enterprise$/.test(x)) return "enterprise"; // customer segment; keep but tag
  if (/\$0-\$50 million/.test(x)) return "arr-sub-50m";
  return x;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");

  const text = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(text);
  const cleaned = rows.map(clean);

  const toInsert = cleaned.filter((c) => !c._skipped);
  const skipped = cleaned.filter((c) => c._skipped);

  console.log(`Parsed ${rows.length} CSV rows.`);
  console.log(`→ ${toInsert.length} advisors to insert.`);
  console.log(`→ ${skipped.length} skipped:`);
  for (const s of skipped) console.log(`   · ${s.name || "(no name)"} — ${s._skipped}`);

  if (!apply) {
    console.log("\n--- Preview (dry-run) ---");
    console.log(JSON.stringify(toInsert, null, 2));
    console.log("\nRe-run with --apply to insert.");
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  let inserted = 0;
  let updated = 0;
  for (const a of toInsert) {
    const existing = await db
      .select({ id: advisors.id })
      .from(advisors)
      .where(and(eq(advisors.id, a.id), eq(advisors.accountId, ACCOUNT_ID)));
    if (existing.length > 0) {
      await db
        .update(advisors)
        .set({
          name: a.name,
          title: a.title,
          company: a.company,
          email: a.email,
          linkedinUrl: a.linkedinUrl,
          location: a.location,
          bio: a.bio,
          expertise: a.expertise,
          focusIndustries: a.focusIndustries,
          updatedAt: new Date(),
        })
        .where(eq(advisors.id, a.id));
      updated++;
    } else {
      await db.insert(advisors).values({
        id: a.id,
        accountId: ACCOUNT_ID,
        curatedByEmail: CURATED_BY,
        name: a.name,
        title: a.title,
        company: a.company,
        email: a.email,
        linkedinUrl: a.linkedinUrl,
        location: a.location,
        bio: a.bio,
        expertise: a.expertise,
        focusIndustries: a.focusIndustries,
      });
      inserted++;
    }
  }

  const [{ n }] = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(advisors)
    .where(eq(advisors.accountId, ACCOUNT_ID));
  console.log(`\nInserted ${inserted}, updated ${updated}. Advisor count for york-ie: ${n}.`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
