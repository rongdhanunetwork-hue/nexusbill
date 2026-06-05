async function testPostBdbulksms() {
  const token = "m3yP891p1a7fP4aZ3c4f";
  const to = "8801734798669";
  const message = "Test SMS via POST";
  const url = "https://api.bdbulksms.net/api.php?json";
  
  console.log(`Checking BDBulkSMS POST to: ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: token,
        to: to,
        message: message,
      }),
    });
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

testPostBdbulksms();
