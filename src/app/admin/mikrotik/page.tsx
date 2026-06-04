import MikrotikClient from "./MikrotikClient";

export const dynamic = "force-dynamic";

export default function MikrotikPage() {
  return <MikrotikClient initialTab="routers" />;
}
