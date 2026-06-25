import pg from 'pg';
const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_Tjz3cLq9ZIOw@ep-steep-moon-ate8ayq5.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });
  await client.connect();

  try {
    const res = await client.query(`
      UPDATE users 
      SET status = 'expired'
      WHERE status = 'active' 
      AND expire_date < NOW();
    `);
    console.log(`Updated expired status for ${res.rowCount} users with past expire dates.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

check();
