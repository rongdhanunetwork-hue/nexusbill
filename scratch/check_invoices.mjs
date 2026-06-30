import pg from 'pg';
const { Client } = pg;

async function fix() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_Tjz3cLq9ZIOw@ep-steep-moon-ate8ayq5.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });
  await client.connect();

  try {
    // We want to delete duplicates.
    // For each user_id and for this month, keep the latest invoice and delete the rest.
    const res = await client.query(`
      WITH Duplicates AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id, status
                 ORDER BY created_at DESC
               ) AS row_num
        FROM invoices
        WHERE status IN ('unpaid', 'due')
      )
      DELETE FROM invoices
      WHERE id IN (
        SELECT id FROM Duplicates WHERE row_num > 1
      );
    `);
    
    console.log(`Deleted ${res.rowCount} duplicate invoices.`);
    
    const sumRes = await client.query(`
      SELECT SUM(i.amount) as total_due
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      WHERE i.status IN ('unpaid', 'due')
    `);
    console.log("New total due amount:", sumRes.rows[0].total_due);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

fix();
