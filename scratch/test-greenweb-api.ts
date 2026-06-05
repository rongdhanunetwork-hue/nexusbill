async function testGreenwebBalance() {
  const token = "m3yP891p1a7fP4aZ3c4f";
  const url = `https://api.greenweb.com.bd/g_api.php?token=${token}&balance&json`;
  console.log(`Checking Greenweb balance using url: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testGreenwebBalance();
