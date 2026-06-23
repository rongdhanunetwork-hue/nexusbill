
import schedule from 'node-schedule';

const API_URL = "http://localhost:3000/api/cron/expire-customers?secret=isp-cron-secret-2024";

console.log("🕒 ISP Billing Cron Runner Started!");
console.log("This will automatically check for expired customers and disconnect them.");

// Run every day at 12:01 AM
schedule.scheduleJob('1 0 * * *', async () => {
  console.log(`[${new Date().toLocaleString()}] ⏳ Running Auto-Disconnection Cron Job...`);
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    
    if (res.ok) {
      console.log(`[${new Date().toLocaleString()}] ✅ Cron Success:`, data);
    } else {
      console.error(`[${new Date().toLocaleString()}] ❌ Cron Failed:`, data);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] 🚨 Cron Error:`, error.message);
  }
});

// Run every hour to check for 3-day SMS Reminders
schedule.scheduleJob('0 * * * *', async () => {
    // Optional: You can create a separate route just for reminders, 
    // but calling the same route is fine as it handles both logic idempotently.
    console.log(`[${new Date().toLocaleString()}] ⏳ Hourly check for reminders/expirations...`);
    try {
      await fetch(API_URL);
    } catch(e) {}
});

console.log("⏳ Scheduled jobs: \n- Auto-Disconnection (Daily at 12:01 AM)\n- Reminders (Hourly)");
