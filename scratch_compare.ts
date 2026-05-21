import { PrismaClient as LocalPrisma } from "@prisma/client";
import { PrismaClient as CloudPrisma } from "@prisma/client";

async function main() {
  const local = new LocalPrisma();
  
  const cloudUrl = process.env.CLOUD_DATABASE_URL;
  if (!cloudUrl) {
    console.error("CLOUD_DATABASE_URL is not set in environment!");
    await local.$disconnect();
    return;
  }

  const cloud = new CloudPrisma({
    datasources: {
      db: {
        url: cloudUrl
      }
    }
  });

  console.log("=== COMPARING PERMISSIONS ===");
  try {
    const localPerms = await local.permission.findMany({ orderBy: { code: "asc" } });
    const cloudPerms = await cloud.permission.findMany({ orderBy: { code: "asc" } });

    console.log(`Local permissions count: ${localPerms.length}`);
    console.log(`Cloud permissions count: ${cloudPerms.length}`);

    const cloudPermsMap = new Map(cloudPerms.map(p => [p.code, p]));
    let permsMatch = true;

    for (const lp of localPerms) {
      const cp = cloudPermsMap.get(lp.code);
      if (!cp) {
        console.log(`❌ Permission code "${lp.code}" exists locally but NOT on cloud.`);
        permsMatch = false;
      } else if (cp.id !== lp.id) {
        console.log(`❌ Permission ID mismatch for "${lp.code}": Local ID="${lp.id}", Cloud ID="${cp.id}"`);
        permsMatch = false;
      }
    }

    if (permsMatch && localPerms.length === cloudPerms.length) {
      console.log("✅ All permission IDs match perfectly between Local and Cloud!");
    }
  } catch (err: any) {
    console.error("Error comparing permissions:", err.message);
  }

  console.log("\n=== COMPARING ROLES ===");
  try {
    const localRoles = await local.role.findMany({ orderBy: { name: "asc" } });
    const cloudRoles = await cloud.role.findMany({ orderBy: { name: "asc" } });

    console.log(`Local roles count: ${localRoles.length}`);
    console.log(`Cloud roles count: ${cloudRoles.length}`);

    const cloudRolesMap = new Map(cloudRoles.map(r => [r.tenantId + "_" + r.name, r]));
    let rolesMatch = true;

    for (const lr of localRoles) {
      const key = lr.tenantId + "_" + lr.name;
      const cr = cloudRolesMap.get(key);
      if (!cr) {
        console.log(`❌ Role "${lr.name}" (Tenant: ${lr.tenantId}) exists locally but NOT on cloud.`);
        rolesMatch = false;
      } else if (cr.id !== lr.id) {
        console.log(`❌ Role ID mismatch for "${lr.name}": Local ID="${lr.id}", Cloud ID="${cr.id}"`);
        rolesMatch = false;
      }
    }

    if (rolesMatch && localRoles.length === cloudRoles.length) {
      console.log("✅ All role IDs match perfectly between Local and Cloud!");
    }
  } catch (err: any) {
    console.error("Error comparing roles:", err.message);
  }

  await local.$disconnect();
  await cloud.$disconnect();
}

main().catch(console.error);
