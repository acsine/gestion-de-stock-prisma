
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const categories = await prisma.category.findMany({ take: 5 });
    console.log('Categories in DB:', JSON.stringify(categories, null, 2));
  } catch (e) {
    console.log('Error querying categories:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
