import { sendSMS } from "../src/lib/sms";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Calling sendSMS...");
  const result = await sendSMS("01734798669", "Test SMS from sendSMS helper");
  console.log("Result:", result);
}

main().catch(console.error);
