import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env");
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

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.CLOUD_DATABASE_URL,
    },
  },
});

async function main() {
  console.log("--- CLOUD DB DETAILS ---");
  
  const licenses = await cloudPrisma.license.findMany();
  console.log("Licenses:", licenses.map(l => ({ id: l.id, name: l.name })));

  const tenants = await cloudPrisma.tenant.findMany();
  console.log("Tenants:", tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, licenseId: t.licenseId })));

  const users = await cloudPrisma.user.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, name: u.name, tenantId: u.tenantId, roleId: u.roleId })));

  const roles = await cloudPrisma.role.findMany();
  console.log("Roles:", roles.map(r => ({ id: r.id, name: r.name, tenantId: r.tenantId })));

  const settings = await cloudPrisma.setting.findMany();
  console.log("Settings count:", settings.length);
  console.log("Settings keys & tenantIds:", settings.map(s => ({ key: s.key, tenantId: s.tenantId })));
}

main()
  .catch(console.error)
  .finally(() => cloudPrisma.$disconnect());
