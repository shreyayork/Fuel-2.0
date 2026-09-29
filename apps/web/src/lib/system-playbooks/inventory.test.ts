import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PLAYBOOK_SLUG_REGEX } from "@/lib/playbooks-constants";
import {
  SYSTEM_PLAYBOOK_DEFAULT_CONTENT,
  SYSTEM_PLAYBOOK_SEED_META,
  buildSystemPlaybookSeeds,
} from "@/lib/system-playbooks/defaults";
import { inventorySummary, PROMPT_INVENTORY } from "@/lib/system-playbooks/inventory";
import { SYSTEM_PLAYBOOK_SLUGS } from "@/lib/system-playbooks/slugs";

describe("system-playbooks defaults", () => {
  it("every slug has seed meta, default content, and valid kebab-case slug", () => {
    for (const slug of SYSTEM_PLAYBOOK_SLUGS) {
      assert.ok(SYSTEM_PLAYBOOK_DEFAULT_CONTENT[slug]?.trim(), `missing default for ${slug}`);
      assert.ok(PLAYBOOK_SLUG_REGEX.test(slug), `invalid slug ${slug}`);
      assert.ok(
        SYSTEM_PLAYBOOK_SEED_META.some((m) => m.slug === slug),
        `missing seed meta for ${slug}`,
      );
    }
  });

  it("buildSystemPlaybookSeeds returns one row per system slug", () => {
    const seeds = buildSystemPlaybookSeeds();
    assert.equal(seeds.length, SYSTEM_PLAYBOOK_SLUGS.length);
    for (const seed of seeds) {
      assert.equal(seed.isSystem, true);
      assert.equal(seed.isVisible, false);
      assert.equal(seed.category, "System");
      assert.ok(seed.content.length > 40);
    }
  });
});

describe("system-playbooks inventory", () => {
  it("covers all migrated system playbooks", () => {
    for (const slug of SYSTEM_PLAYBOOK_SLUGS) {
      const row = PROMPT_INVENTORY.find((r) => r.systemPlaybookKey === slug);
      assert.ok(row, `inventory missing ${slug}`);
      assert.equal(row?.migrationStatus, "migrated");
    }
  });

  it("summary counts are consistent", () => {
    const s = inventorySummary();
    assert.equal(s.systemPlaybookSlugs, SYSTEM_PLAYBOOK_SLUGS.length);
    assert.equal(s.staticSystemPromptsMigrated, SYSTEM_PLAYBOOK_SLUGS.length);
    assert.ok(s.totalDiscovered >= s.migrated);
  });
});
