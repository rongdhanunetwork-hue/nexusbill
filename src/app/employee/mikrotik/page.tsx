import MikrotikClient from "@/app/admin/mikrotik/MikrotikClient";

export const dynamic = "force-dynamic";

export default function EmployeeMikrotikPage() {
  return <MikrotikClient role="employee" />;
}
