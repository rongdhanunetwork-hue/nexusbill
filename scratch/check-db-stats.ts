import { db } from "@/db";
import { users, packages } from "@/db/schema";

async function main() {
  try {
    const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : undefined;

    // Fetch users and filter in JS to avoid using query builders here
    const allUsers = await db.query.users.findMany({ with: { package: true } as any });
    const allDbCustomers = allUsers.filter(u => u.role === 'customer' && (!adminId || u.adminId === adminId));

    const totalCustomers = allDbCustomers.length;
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);

    const activeCustomers = allDbCustomers.filter(c => {
      if (c.status !== 'active') return false;
      if (!c.expireDate) return true;
      const exp = new Date(c.expireDate);
      exp.setHours(0,0,0,0);
      return exp.getTime() >= startOfToday.getTime();
    }).length;

    const expiredCustomers = allDbCustomers.filter(c => {
      if (c.status === 'expired') return true;
      if (!c.expireDate) return false;
      const exp = new Date(c.expireDate);
      exp.setHours(0,0,0,0);
      return exp.getTime() < startOfToday.getTime();
    }).length;

    const newCustomersThisMonth = allDbCustomers.filter(c => c.createdAt && new Date(c.createdAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length;

    console.log('DB Stats');
    console.log('-------');
    console.log('Total customers:', totalCustomers);
    console.log('Active customers:', activeCustomers);
    console.log('Expired customers:', expiredCustomers);
    console.log('Running month new:', newCustomersThisMonth);

    process.exit(0);
  } catch (err) {
    console.error('Error fetching DB stats:', err);
    process.exit(1);
  }
}

main();
