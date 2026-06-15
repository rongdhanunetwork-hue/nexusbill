const baseDate = new Date("2026-06-01T10:00:00+06:00");
const numDuration = 30;

const newExpireDate = new Date(baseDate);
newExpireDate.setDate(newExpireDate.getDate() + (numDuration - 1));
newExpireDate.setHours(23, 59, 59, 999);

console.log("Base Date:", baseDate.toLocaleString());
console.log("New Expire Date:", newExpireDate.toLocaleString());

// getDaysLeft (modified)
const getDaysLeft = (expireDate, simulateDate) => {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  const today = new Date(simulateDate); 
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Added +1 for inclusive counting
};

console.log("Days Left on June 1 (Recharge day):", getDaysLeft(newExpireDate, "2026-06-01T10:00:00+06:00"));
console.log("Days Left on June 30 (Last day):", getDaysLeft(newExpireDate, "2026-06-30T10:00:00+06:00"));
console.log("Days Left on July 1 (Expired day):", getDaysLeft(newExpireDate, "2026-07-01T10:00:00+06:00"));
