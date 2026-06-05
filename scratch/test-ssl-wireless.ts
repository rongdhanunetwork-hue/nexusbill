async function testSslWireless() {
  const apiKey = "m3yP891p1a7fP4aZ3c4f";
  const senderId = "NexusBill";
  const url = "https://smsplus.sslwireless.com/api/v3/send-sms";
  
  // We will just do a check, or send a request. Since it needs parameters,
  // let's do a request to send a test SMS to 01734798669.
  const params = new URLSearchParams({
    api_token: apiKey,
    sid: senderId,
    msisdn: "8801734798669",
    sms: "Test SSL Wireless SMS from ISP",
    csms_id: `test-${Date.now()}`
  });

  console.log(`Checking SSL Wireless using URL: ${url}?${params.toString()}`);
  try {
    const res = await fetch(`${url}?${params.toString()}`);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testSslWireless();
