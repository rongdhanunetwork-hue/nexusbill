import pg from 'pg';
const { Client } = pg;

async function fix() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_Tjz3cLq9ZIOw@ep-steep-moon-ate8ayq5.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });
  await client.connect();

  console.log("Fixing unpaid invoices for active customers...");
  
  const query = `
    UPDATE invoices
    SET status = 'paid'
    WHERE status IN ('unpaid', 'due')
    AND user_id IN (
      SELECT id FROM users 
      WHERE status = 'active' 
      AND expire_date > NOW()
    );
  `;

  try {
    const res = await client.query(query);
    console.log(`Successfully fixed ${res.rowCount} unpaid invoices for active customers!`);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await client.end();
  }
}

fix();
