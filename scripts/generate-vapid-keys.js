// Script to generate VAPID keys for Web Push Notifications
// Run this once to generate keys, then add them to your environment variables

const crypto = require("crypto")

function generateVAPIDKeys() {
  // Generate a key pair for VAPID
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  })

  // Convert to URL-safe base64
  const publicKeyBase64 = Buffer.from(publicKey).toString("base64url")
  const privateKeyBase64 = Buffer.from(privateKey).toString("base64url")

  console.log("\n=== VAPID Keys Generated ===\n")
  console.log("Add these to your environment variables:\n")
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBase64}`)
  console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`)
  console.log("\n============================\n")
  console.log("Copy these values and add them to your project environment variables in the Vars section of v0.")
}

generateVAPIDKeys()
