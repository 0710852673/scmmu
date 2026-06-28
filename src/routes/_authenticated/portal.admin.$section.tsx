import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalPage, Card } from "@/components/portal/PortalUI";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/$section")({
  component: AdminPlaceholder,
});

const META: Record<string, { title: string; sub: string }> = {
  board: { title: "Board & Leadership", sub: "Manage TIC, Executive Board and Section Heads." },
  projects: { title: "Projects", sub: "Publish, edit and feature productions." },
  events: { title: "Events", sub: "Add, edit and archive school events." },
  gallery: { title: "Gallery", sub: "Curate the public gallery." },
};

function AdminPlaceholder() {
  const { section } = Route.useParams();
  const meta = META[section] ?? { title: section, sub: "Admin section." };

  return (
    <PortalPage eyebrow="Administrator" title={meta.title}>
      <Card className="max-w-2xl">
        <Construction className="h-8 w-8 text-brand mb-4" />
        <h2 className="font-display text-xl font-bold">Editor shipping in the next wave</h2>
        <p className="text-sm text-muted-foreground mt-2">{meta.sub}</p>
        <p className="text-sm text-muted-foreground mt-4">
          For now, use <Link to="/portal/admin/site" className="underline font-medium text-foreground">Site Settings</Link> for hero text,
          live stats, contact info and social links — the most-edited parts of the public site.
        </p>
      </Card>
    </PortalPage>
  );
}
