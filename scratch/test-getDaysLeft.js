const getDaysLeftExact = (expireDate, simulateDate) => {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  const today = new Date(simulateDate); 
  
  // Do NOT zero out hours!
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Simulate Today: June 15, 2026, 5:00 PM
const todayStr = "2026-06-15T17:00:00+06:00";

// Old Data (Client recharged 30 days on June 16, 9:00 AM)
const oldExpire = "2026-07-16T09:00:00+06:00";
console.log("Old Data (July 16 9AM) shown on UI:", getDaysLeftExact(oldExpire, todayStr));

// New Data (Client recharges 30 days on June 15, sets to July 14 23:59:59)
const newExpire = "2026-07-14T23:59:59+06:00";
console.log("New Data (July 14 23:59) shown on UI:", getDaysLeftExact(newExpire, todayStr));

// What happens on the last day? (July 14, 10:00 AM)
console.log("New Data on last day (July 14 10AM):", getDaysLeftExact(newExpire, "2026-07-14T10:00:00+06:00"));

// What happens on the next day? (July 15, 10:00 AM)
console.log("New Data on next day (July 15 10AM):", getDaysLeftExact(newExpire, "2026-07-15T10:00:00+06:00"));
