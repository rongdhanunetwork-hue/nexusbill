import { Client } from "pg";

const OLD_URL = "postgresql://nexusbill_db_user:WG2FtrdTtKZmqjfbHUHCi8s1OrHxh6AA@dpg-d89cisul51nc738a5jk0-a.singapore-postgres.render.com/nexusbill_db?ssl=true";
const NEW_URL = "postgresql://neondb_owner:npg_Tjz3cLq9ZIOw@ep-steep-moon-ate8ayq5.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Define table names explicitly or fetch them dynamically.
// We must only copy data for our tables.
const TABLES = [
  "users",
  "mikrotiks",
  "packages",
  "olts",
  "areas",
  "zones",
  "payments",
  "invoices",
  "transactions",
  "expenses",
  "tickets",
  "data_usage",
  "audit_logs",
  "sms_logs",
  "sms_templates",
  "settings"
];

async function migrate() {
  console.log("Connecting to old database...");
  const oldDb = new Client({ connectionString: OLD_URL });
  await oldDb.connect();

  console.log("Connecting to new database...");
  const newDb = new Client({ connectionString: NEW_URL });
  await newDb.connect();

  try {
    console.log("Starting migration (no FK checks needed for app-level relations)...");
    // await newDb.query("SET session_replication_role = 'replica';");

    // Clear existing data in new DB if any
    for (const table of TABLES) {
      try {
        await newDb.query(`TRUNCATE TABLE ${table} CASCADE;`);
        console.log(`Cleared ${table}`);
      } catch (err) {
        console.log(`Failed to clear ${table} (maybe doesn't exist yet)`);
      }
    }

    for (const table of TABLES) {
      console.log(`\nMigrating table: ${table}...`);
      try {
        const result = await oldDb.query(`SELECT * FROM ${table}`);
        const rows = result.rows;
        
        if (rows.length === 0) {
          console.log(`  No data in ${table}`);
          continue;
        }

        const columns = Object.keys(rows[0]);
        console.log(`  Found ${rows.length} rows with columns: ${columns.join(', ')}`);

        // Batch insert in chunks of 100 rows to avoid parameter limits
        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          
          let placeholders = [];
          let values = [];
          let paramIdx = 1;
          
          for (const row of chunk) {
            const rowPlaceholders = [];
            for (const col of columns) {
              rowPlaceholders.push(`$${paramIdx++}`);
              values.push(row[col]);
            }
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
          }
          
          const colNames = columns.map(c => `"${c}"`).join(', ');
          await newDb.query(
            `INSERT INTO ${table} (${colNames}) VALUES ${placeholders.join(', ')}`,
            values
          );
        }
        console.log(`  Successfully migrated ${rows.length} rows for ${table}`);

        // Update sequence (vital for auto-increment IDs)
        try {
          await newDb.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id)+1 FROM ${table}), 1), false);`);
          console.log(`  Updated sequence for ${table}`);
        } catch (seqErr) {
          // Some tables might not have an 'id' auto-increment column
        }

      } catch (err: any) {
        console.error(`  Error migrating table ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    console.log("\nMigration finished!");
    // await newDb.query("SET session_replication_role = 'origin';");
    
    await oldDb.end();
    await newDb.end();
  }
}

migrate();
