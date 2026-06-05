async function testBalance() {
  const token = "m3yP891p1a7fP4aZ3c4f";
  const url = `https://api.bdbulksms.net/g_api.php?token=${token}&balance&json`;
  console.log(`Checking balance using url: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Response text:", text);
    try {
      const json = JSON.parse(text);
      console.log("Response JSON:", json);
    } catch {
      console.log("Response is not JSON");
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

async function testSendSms() {
  const token = "m3yP891p1a7fP4aZ3c4f";
  // We'll test with a query string GET request
  const message = encodeURIComponent("Test SMS from ISP Billing system");
  const to = "8801734798669";
  const url = `https://api.bdbulksms.net/api.php?token=${token}&to=${to}&message=${message}&json`;
  console.log(`Testing send SMS using url: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Send SMS Response:", text);
  } catch (err) {
    console.error("Send SMS Fetch failed:", err);
  }
}

async function run() {
  await testBalance();
  // Don't call testSendSms unless token is valid to avoid wasting SMS balance,
  // but let's see what the balance check returns first.
}

run();
