"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { EvidenceList } from "@/components/app/EvidenceList";

export default function KnowledgePage() {
  return (
    <>
      <PageHeader
        title="Evidence library"
        blurb="The documents Harmony checks every draft against."
      />
      <EvidenceList />
    </>
  );
}
