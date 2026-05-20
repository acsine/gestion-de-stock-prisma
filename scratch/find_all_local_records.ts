import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=== ALL LOCAL PRODUCTS ===");
  const products = await prisma.product.findMany({
    include: {
      tenant: true
    }
  });
  console.log(`Total local products: ${products.length}`);
  products.forEach(p => {
    console.log(`- Product: ID=${p.id}, SKU=${p.sku}, Name=${p.name}, TenantID=${p.tenantId} (${p.tenant.name}), isSynced=${p.isSynced}`);
  });

  console.log("\n=== ALL LOCAL STOCK MOVEMENTS ===");
  const movements = await prisma.stockMovement.findMany({
    include: {
      tenant: true,
      product: true
    }
  });
  console.log(`Total local stock movements: ${movements.length}`);
  movements.forEach(m => {
    console.log(`- Movement: ID=${m.id}, Product=${m.product.name}, Quantity=${m.quantity}, TenantID=${m.tenantId} (${m.tenant.name}), isSynced=${m.isSynced}`);
  });

  console.log("\n=== ALL LOCAL AUDIT LOGS ===");
  const logs = await prisma.auditLog.findMany({
    include: {
      user: true
    }
  });
  console.log(`Total local audit logs: ${logs.length}`);
  logs.forEach(l => {
    console.log(`- Log: ID=${l.id}, Action=${l.action}, User=${l.user.email}, isSynced=${l.isSynced}`);
  });

  console.log("\n=== ALL LOCAL USERS ===");
  const users = await prisma.user.findMany();
  console.log(`Total local users: ${users.length}`);
  users.forEach(u => {
    console.log(`- User: ID=${u.id}, Email=${u.email}, Name=${u.name}, TenantID=${u.tenantId}`);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
