import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking columns of the 'users' table...");
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    console.log(columns);
  } catch (err: any) {
    console.error("Error checking columns:", err.message);
  }
}

main()
  .finally(() => prisma.$disconnect());
