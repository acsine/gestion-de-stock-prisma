import crypto from "crypto";
import fs from "fs";
import path from "path";

// Load .env variables manually
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const webhookSecret = process.env.PAAYIT_WEBHOOK_SECRET || "whsec_mock_secret";
const tenantId = process.argv[2] || "cmpcx43ab0005h8cwmb54vjgf"; // Default demo tenant ID
const licenseId = process.argv[3] || "cmpcx40nd0001h8cwygodxnza"; // Default PROFESSIONAL license ID

const payload = {
  event: "transaction.updated",
  transaction_id: "txn_test_" + Math.random().toString(36).substring(2, 11),
  type: "deposit",
  status: "success",
  amount: 50000,
  net_amount: 49000,
  phone_number: "+237677777777",
  service: "MTN",
  timestamp: new Date().toISOString(),
  reference: `LIC_${tenantId}_${licenseId}_${Date.now()}`
};

const payloadString = JSON.stringify(payload);
const hmac = crypto
  .createHmac("sha256", webhookSecret)
  .update(payloadString)
  .digest("hex");

console.log("Payload to send:", payloadString);
console.log("Computed Signature:", hmac);

async function sendWebhook() {
  const url = "http://localhost:3001/api/payment/paayit/webhook";
  console.log(`Sending POST request to ${url}...`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Paayit-Signature": hmac,
      },
      body: payloadString,
    });
    
    const text = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${text}`);
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}

sendWebhook();
