
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function check() {
  const email = "superadmin@thaborsolution.com";
  const password = "SuperAdmin@2026";
  
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    console.log("User not found");
    return;
  }
  
  const match = await bcrypt.compare(password, user.passwordHash);
  console.log("Password match:", match);
  console.log("User ID:", user.id);
  console.log("User Email:", user.email);
  console.log("User Hash:", user.passwordHash);
}

check().catch(console.error).finally(() => prisma.$disconnect());
