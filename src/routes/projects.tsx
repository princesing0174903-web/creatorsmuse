import { createFileRoute } from "@tanstack/react-router";
<<<<<<< HEAD
import { requireAuthBeforeLoad } from "@/lib/auth-guard";
=======
import { requireAuthBeforeLoad } from "@/lib/route-auth";
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
import { FolderOpen } from "lucide-react";
import { PlaceholderPage } from "@/components/app-shell";

export const Route = createFileRoute("/projects")({
  beforeLoad: requireAuthBeforeLoad,
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