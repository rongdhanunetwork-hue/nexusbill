const baseDate = new Date("2026-06-01T10:00:00+06:00");
const numDuration = 30;

const newExpireDate = new Date(baseDate);
newExpireDate.setDate(newExpireDate.getDate() + (numDuration - 1));
newExpireDate.setHours(23, 59, 59, 999);

console.log("Base Date:", baseDate.toLocaleString());
console.log("New Expire Date:", newExpireDate.toLocaleString());

// getDaysLeft
const getDaysLeft = (expireDate) => {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  const today = new Date(baseDate); // simulate today
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

console.log("Days Left shown in portal:", getDaysLeft(newExpireDate));
