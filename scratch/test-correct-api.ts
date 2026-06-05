async function testCorrectBdbulksms() {
  const token = "m3yP891p1a7fP4aZ3c4f";
  const to = "8801734798669";
  const message = encodeURIComponent("Test SMS from ISP");
  const url = `https://api.bdbulksms.net/api.php?token=${token}&to=${to}&message=${message}&json`;
  
  console.log(`Checking BDBulkSMS send via URL: ${url}`);
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

testCorrectBdbulksms();
