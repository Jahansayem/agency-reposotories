import { RetroactiveLinkingTool } from '@/components/admin/RetroactiveLinkingTool';

export default function RetroactiveLinkingPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Retroactive Customer Linking
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Review and approve suggested customer links for completed tasks
        </p>
      </div>
      <RetroactiveLinkingTool />
    </div>
  );
}
