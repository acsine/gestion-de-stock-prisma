
import prisma from "../src/lib/prisma";
import { generateStockExcel } from "../src/lib/reports";
import fs from "fs";

async function test() {
  try {
    console.log("Fetching products...");
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true },
    });
    console.log(`Found ${products.length} products.`);
    
    console.log("Generating Excel...");
    const buffer = await generateStockExcel(products);
    console.log("Excel generated.");
    
    fs.writeFileSync("test_report.xlsx", Buffer.from(buffer));
    console.log("File written to test_report.xlsx");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
