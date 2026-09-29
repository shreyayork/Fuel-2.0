import { PlaybooksCatalog } from "@/components/views/PlaybooksCatalog";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { buildPlaybookTree, listPlaybooks } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const sp = await searchParams;

  const account = await getActiveAccountForUser(email);
  if (!account) return <div style={{ padding: 40 }}>No account yet.</div>;

  const flat = await listPlaybooks({
    accountId: account.id,
    query: sp.q,
    category: sp.category,
  });
  const tree = buildPlaybookTree(flat);

  return (
    <PlaybooksCatalog
      tree={tree.map((node) => ({
        category: node.category,
        subcategories: node.subcategories.map((s) => ({
          name: s.name,
          playbooks: s.playbooks.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            description: p.description,
            category: p.category,
            subcategory: p.subcategory,
            visibility: p.visibility,
            tags: p.tags ?? null,
            targetKind: p.targetKind,
          })),
        })),
      }))}
      activeQuery={sp.q ?? ""}
      activeCategory={sp.category ?? null}
      totalCount={flat.length}
    />
  );
}
