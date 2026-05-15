import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { PlaceholderPage } from "@/components/app-shell";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — Nexus" },
      { name: "description", content: "Manage your creator projects." },
    ],
  }),
});

function ProjectsPage() {
  return (
    <PlaceholderPage
      title="Projects"
      description="Organize your generations into projects. Save, revisit, and iterate on synthesized assets across campaigns."
      icon={FolderOpen}
    />
  );
}