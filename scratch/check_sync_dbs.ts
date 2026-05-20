import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env file
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

async function run() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("CLOUD_DATABASE_URL:", process.env.CLOUD_DATABASE_URL);

  try {
    const localTenants = await localPrisma.tenant.findMany();
    const localUsers = await localPrisma.user.findMany();
    const localProducts = await localPrisma.product.findMany();
    console.log("\n--- LOCAL DATABASE ---");
    console.log(`Tenants count: ${localTenants.length}`);
    console.log(`Users count: ${localUsers.length}`);
    console.log(`Products count: ${localProducts.length}`);
    console.log("Tenants:", localTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
    console.log("Users:", localUsers.map(u => ({ id: u.id, email: u.email, name: u.name, tenantId: u.tenantId })));
  } catch (err) {
    console.error("Error querying local DB:", err);
  }

  try {
    const cloudTenants = await cloudPrisma.tenant.findMany();
    const cloudUsers = await cloudPrisma.user.findMany();
    const cloudProducts = await cloudPrisma.product.findMany();
    console.log("\n--- CLOUD DATABASE ---");
    console.log(`Tenants count: ${cloudTenants.length}`);
    console.log(`Users count: ${cloudUsers.length}`);
    console.log(`Products count: ${cloudProducts.length}`);
    console.log("Tenants:", cloudTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
    console.log("Users:", cloudUsers.map(u => ({ id: u.id, email: u.email, name: u.name, tenantId: u.tenantId })));
  } catch (err) {
    console.error("Error querying cloud DB:", err);
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await cloudPrisma.$disconnect();
  });
