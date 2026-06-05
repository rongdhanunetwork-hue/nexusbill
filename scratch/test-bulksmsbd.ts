async function testBulkSmsBdBalance() {
  const apiKey = "m3yP891p1a7fP4aZ3c4f";
  const url = `http://bulksmsbd.net/api/getBalanceApi?api_key=${apiKey}`;
  console.log(`Checking bulksmsbd.net balance using url: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testBulkSmsBdBalance();
