// File: src/components/records/StatusBadge.tsx
import { STATUS_BY_VALUE } from "@/config";
import type { RecordStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

const StatusBadge = ({ status }: { status: RecordStatus }) => {
  const normalizedKey = String(status || "open").toLowerCase().replace(/\s+/g, "_");
  const config = STATUS_BY_VALUE[normalizedKey as RecordStatus] || STATUS_BY_VALUE["open"] || {
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    chart: "#3b82f6",
    label: String(status || "Open")
  };

  return (
    <Badge className={cn(config.badge)}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.chart }}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;