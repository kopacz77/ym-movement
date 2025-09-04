// scripts/generate-admin-password.js
import bcrypt from "bcrypt";

async function generateAdminPassword() {
  // Generate a secure password
  const newPassword = "AdminPass2025!";

  console.log("=".repeat(50));
  console.log("🔐 NEW ADMIN PASSWORD GENERATED");
  console.log("=".repeat(50));
  console.log(`Password: ${newPassword}`);

  // Generate bcrypt hash
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  console.log(`Bcrypt Hash: ${hashedPassword}`);

  console.log("=".repeat(50));
  console.log("📝 INSTRUCTIONS:");
  console.log("1. Use the PASSWORD above to login");
  console.log("2. Update your database with the HASH above");
  console.log("3. Change this password after first login!");
  console.log("=".repeat(50));
}

generateAdminPassword().catch(console.error);
