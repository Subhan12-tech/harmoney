"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { FolderBrowser } from "@/components/app/FolderBrowser";

export default function FilesPage() {
  return (
    <>
      <PageHeader
        title="Files"
        blurb="Organise your documents into folders. You decide the structure — create, rename, and nest folders however you like."
      />
      <FolderBrowser />
    </>
  );
}
