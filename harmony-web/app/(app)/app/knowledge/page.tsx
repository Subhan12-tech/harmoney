"use client";

import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { getGraph } from "@/lib/data";
import { KnowledgeGraph } from "@/components/app/KnowledgeGraph";
import { SkeletonCard } from "@/components/app/Skeleton";
import { PageHeader } from "@/components/app/PageHeader";

export default function KnowledgePage() {
  const { orgId } = useRole();
  const nodes = useAsyncData(() => getGraph(orgId), [orgId], []);

  if (nodes.length === 0) {
    return <SkeletonCard height={520} />;
  }

  return (
    <>
      <PageHeader title="Evidence library" blurb="Everything Harmony checks your drafts against." />

      <KnowledgeGraph nodes={nodes} />
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 10, maxWidth: 760 }}>
        Node size reflects statement count; line weight and opacity reflect relationship confidence. Select a node
        to inspect its statements and evidence.
      </p>
    </>
  );
}
