import { db } from "@/db";
import { users, packages } from "@/db/schema";
import { eq, not } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PackageChangeClient from "./PackageChangeClient";

export const dynamic = "force-dynamic";

export default async function CustomerPackageChangePage() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/login/customer");
  }

  // Fetch customer details with their package
  const customer = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: {
      package: true,
    }
  });

  if (!customer) {
    redirect("/login/customer");
  }

  // Fetch all other available packages
  const allPackages = await db.query.packages.findMany();

  return (
    <PackageChangeClient
      currentPackage={customer.package || null}
      availablePackages={allPackages}
    />
  );
}
