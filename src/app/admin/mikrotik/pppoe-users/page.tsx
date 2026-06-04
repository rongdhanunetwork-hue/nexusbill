import MikrotikClient from "../MikrotikClient";

export const dynamic = "force-dynamic";

export default function PPPoEUsersPage() {
  return <MikrotikClient initialTab="live" />;
}
