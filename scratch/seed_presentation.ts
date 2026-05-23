import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = "fomocaleb2@gmail.com";

async function main() {
  console.log("🌱 Démarrage de la génération des données de présentation...");

  // 1. Rechercher l'utilisateur ciblé dans la DB locale
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user || !user.tenantId) {
    console.error(`\n❌ [ERREUR] L'utilisateur ${email} n'existe pas encore localement.`);
    console.log("Veuillez d'abord lancer l'installation et synchroniser votre compte en ligne");
    console.log("pour que votre compte et votre Tenant soient rapatriés localement.");
    process.exit(1);
  }

  const tenantId = user.tenantId;
  const userId = user.id;

  console.log(`\n🏢 Marchand détecté : ${user.tenant?.name} (Tenant ID: ${tenantId})`);
  console.log(`👤 Utilisateur connecté : ${user.name} (User ID: ${userId})`);

  // Nettoyer d'abord les anciennes données de ce tenant pour éviter les doublons/conflits
  console.log("\n🧹 Nettoyage des anciennes données de présentation pour ce tenant...");
  await prisma.transaction.deleteMany({ where: { tenantId } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.invoiceItem.deleteMany({ where: { tenantId } });
  await prisma.invoice.deleteMany({ where: { tenantId } });
  await prisma.stockMovement.deleteMany({ where: { tenantId } });
  await prisma.alert.deleteMany({ where: { tenantId } });
  await prisma.orderItem.deleteMany({ where: { tenantId } });
  await prisma.purchaseOrder.deleteMany({ where: { tenantId } });
  await prisma.ticket.deleteMany({ where: { tenantId } });
  await prisma.product.deleteMany({ where: { tenantId } });
  await prisma.category.deleteMany({ where: { tenantId } });
  await prisma.supplier.deleteMany({ where: { tenantId } });
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.cashAccount.deleteMany({ where: { tenantId } });
  await prisma.payroll.deleteMany({ where: { tenantId } });
  await prisma.leave.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  console.log("✅ Nettoyage terminé.");

  // 2. CRÉATION DES CATÉGORIES
  console.log("\n📁 Création des catégories...");
  const categoriesData = [
    { name: "Téléphones & Tablettes", slug: "telephones-tablettes", color: "#3B82F6", icon: "Smartphone", description: "Smartphones, tablettes tactiles et accessoires mobiles" },
    { name: "Ordinateurs & Portables", slug: "ordinateurs-portables", color: "#10B981", icon: "Laptop", description: "Laptops, ordinateurs de bureau et stations de travail" },
    { name: "Périphériques & Connectique", slug: "peripheriques-connectique", color: "#8B5CF6", icon: "Cable", description: "Souris, claviers, écrans, adaptateurs et câbles" },
    { name: "Bureautique & Papeterie", slug: "bureautique-papeterie", color: "#F59E0B", icon: "FileText", description: "Fournitures de bureau, papier, stylos et organiseurs" }
  ];

  const categoriesMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.create({
      data: { ...c, tenantId }
    });
    categoriesMap[c.slug] = cat.id;
  }
  console.log("✅ Catégories créées.");

  // 3. CRÉATION DES FOURNISSEURS
  console.log("\n🚚 Création des fournisseurs...");
  const suppliersData = [
    { name: "Afriq Import Sarl", contactName: "M. Kamga Jean", phone: "+237 677 88 99 00", email: "contact@afriq-import.com", address: "Akwa", city: "Douala", paymentTerms: 30, balance: 1250000 },
    { name: "Sodimac Technologie", contactName: "Mme. Diane Mbia", phone: "+237 699 55 44 33", email: "sales@sodimac-tech.net", address: "Mvan", city: "Yaoundé", paymentTerms: 15, balance: 0 }
  ];

  const suppliersList: any[] = [];
  for (const s of suppliersData) {
    const sup = await prisma.supplier.create({
      data: { ...s, tenantId }
    });
    suppliersList.push(sup);
  }
  console.log("✅ Fournisseurs créés.");

  // 4. CRÉATION DES CLIENTS
  console.log("\n👥 Création des clients...");
  const customersData = [
    { name: "ETS Nguene & Fils", type: "ENTREPRISE" as const, phone: "+237 655 11 22 33", email: "info@nguene-fils.cm", address: "Bonapriso", city: "Douala", discount: 5, creditLimit: 2000000, balance: -450000 },
    { name: "Mme. Aïcha Toure", type: "PARTICULIER" as const, phone: "+237 680 12 34 56", email: "aicha.toure@gmail.com", address: "Bastos", city: "Yaoundé", discount: 0, creditLimit: 500000, balance: 0 },
    { name: "Bureaux Plus SA", type: "GROSSISTE" as const, phone: "+237 233 44 55 66", email: "procurement@bureauxplus.com", address: "Zone Industrielle", city: "Douala", discount: 10, creditLimit: 5000000, balance: -1850000 }
  ];

  const customersList: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: { ...c, tenantId }
    });
    customersList.push(cust);
  }
  console.log("✅ Clients créés.");

  // 5. CRÉATION DES COMPTES DE TRESORERIE
  console.log("\n💵 Création des comptes de trésorerie...");
  const cashAccountsData = [
    { key: "Caisse", name: "Caisse Principale (Espèces)", type: "CAISSE" as const, balance: 750000, currency: "XAF" },
    { key: "UBA", name: "Compte UBA Banque", type: "BANQUE" as const, balance: 4850000, currency: "XAF" },
    { key: "Orange/MTN", name: "Compte Mobile Money (Orange/MTN)", type: "MOBILE_MONEY" as const, balance: 320000, currency: "XAF" }
  ];

  const accountsMap: Record<string, string> = {};
  for (const a of cashAccountsData) {
    const { key, ...cleanAcc } = a;
    const acc = await prisma.cashAccount.create({
      data: { ...cleanAcc, tenantId }
    });
    accountsMap[key] = acc.id;
  }
  console.log("✅ Comptes de trésorerie créés.");

  // 6. CRÉATION DES PRODUITS
  console.log("\n📦 Création des produits avec stocks initiaux...");
  const productsData = [
    { sku: "IPH-15PM-256", name: "iPhone 15 Pro Max 256GB", buyPrice: 750000, sellPrice: 950000, unit: "Pièce", currentStock: 15, minStock: 3, maxStock: 50, location: "Rayon A-1", barcode: "190199000101", slug: "telephones-tablettes", supplierIndex: 0 },
    { sku: "SAM-S24U-512", name: "Samsung Galaxy S24 Ultra 512GB", buyPrice: 700000, sellPrice: 890000, unit: "Pièce", currentStock: 8, minStock: 2, maxStock: 30, location: "Rayon A-2", barcode: "880609000202", slug: "telephones-tablettes", supplierIndex: 0 },
    { sku: "MAC-M3-16G", name: "MacBook Pro 14\" Apple M3 (16GB/512GB)", buyPrice: 1150000, sellPrice: 1450000, unit: "Pièce", currentStock: 4, minStock: 1, maxStock: 15, location: "Vitrine Centrale", barcode: "194253000303", slug: "ordinateurs-portables", supplierIndex: 1 },
    { sku: "DEL-U27-2K", name: "Écran Professionnel Dell UltraSharp 27\"", buyPrice: 210000, sellPrice: 285000, unit: "Pièce", currentStock: 12, minStock: 3, maxStock: 40, location: "Rayon B-4", barcode: "088265000404", slug: "peripheriques-connectique", supplierIndex: 1 },
    { sku: "LOG-MX3S-ERG", name: "Souris Sans Fil Logitech MX Master 3S", buyPrice: 48000, sellPrice: 69000, unit: "Pièce", currentStock: 2, minStock: 5, maxStock: 50, location: "Rayon B-1", barcode: "097855000505", slug: "peripheriques-connectique", supplierIndex: 0 }, // Stock bas pour alerte !
    { sku: "PAP-A4-DOUBLEA", name: "Rame de papier A4 Double A 80g", buyPrice: 2800, sellPrice: 3800, unit: "Carton", currentStock: 45, minStock: 10, maxStock: 200, location: "Hangar Sud", barcode: "885012000606", slug: "bureautique-papeterie", supplierIndex: 1 }
  ];

  const productsList: any[] = [];
  for (const p of productsData) {
    const { slug, supplierIndex, ...cleanProd } = p;
    const prod = await prisma.product.create({
      data: {
        ...cleanProd,
        tenantId,
        categoryId: categoriesMap[slug],
        supplierId: suppliersList[supplierIndex].id,
        status: "ACTIF"
      }
    });
    productsList.push(prod);

    // Créer le mouvement de stock d'entrée initiale pour justifier le stock actuel
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: prod.id,
        type: "ENTREE_AJUSTEMENT",
        quantity: p.currentStock,
        reason: "Stock d'ouverture initial de présentation",
        reference: "INIT-STOCK",
        unitPrice: p.buyPrice,
        userId
      }
    });

    // Créer une alerte si le stock actuel est sous le minStock (mx master souris)
    if (p.currentStock <= p.minStock) {
      await prisma.alert.create({
        data: {
          tenantId,
          productId: prod.id,
          type: "STOCK_BAS",
          message: `Le stock du produit "${prod.name}" (${p.currentStock} ${prod.unit}) est inferieur au seuil minimum d'alerte (${p.minStock}).`,
          isRead: false
        }
      });
    }
  }
  console.log("✅ Produits et stocks initiaux créés.");

  // 7. CRÉATION DES FACTURES (VENTES HISTORIQUES POUR RAPPORTS)
  console.log("\n📊 Création de l'historique des factures et règlements...");
  const invoiceDates = [
    new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // Il y a 25 jours
    new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // Il y a 18 jours
    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Il y a 10 jours
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),  // Il y a 5 jours
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),  // Il y a 2 jours
    new Date(Date.now() - 6 * 60 * 60 * 1000)        // Il y a 6 heures
  ];

  // Facture 1 - Payée
  const inv1 = await prisma.invoice.create({
    data: {
      tenantId,
      number: `FAC-${new Date().getFullYear()}-001`,
      type: "FACTURE",
      status: "PAYE",
      customerId: customersList[0].id, // ETS Nguene
      userId,
      discount: 0,
      subtotal: 1900000, // 2x iPhone 15
      taxAmount: 365750, // 19.25%
      total: 2265750,
      paidAmount: 2265750,
      issueDate: invoiceDates[0],
      createdAt: invoiceDates[0],
      updatedAt: invoiceDates[0]
    }
  });
  await prisma.invoiceItem.create({
    data: {
      tenantId,
      invoiceId: inv1.id,
      productId: productsList[0].id, // iPhone
      quantity: 2,
      unitPrice: 950000,
      total: 1900000,
      taxRate: 19.25
    }
  });
  // Diminuer le stock suite à la vente
  await prisma.stockMovement.create({
    data: {
      tenantId,
      productId: productsList[0].id,
      type: "SORTIE_VENTE",
      quantity: 2,
      reason: `Facture de vente ${inv1.number}`,
      reference: inv1.number,
      unitPrice: 950000,
      userId,
      invoiceId: inv1.id,
      createdAt: invoiceDates[0]
    }
  });
  // Règlement associé
  await prisma.payment.create({
    data: {
      tenantId,
      invoiceId: inv1.id,
      amount: 2265750,
      method: "VIREMENT",
      reference: "VIR-UBA-98213",
      note: "Paiement intégral facture 001",
      paidAt: invoiceDates[0],
      createdAt: invoiceDates[0]
    }
  });

  // Facture 2 - Partiellement Payée
  const inv2 = await prisma.invoice.create({
    data: {
      tenantId,
      number: `FAC-${new Date().getFullYear()}-002`,
      type: "FACTURE",
      status: "PARTIELLEMENT_PAYE",
      customerId: customersList[2].id, // Bureaux Plus
      userId,
      discount: 5, // 5% discount
      subtotal: 1735000, // 1x MacBook (1450000) + 1x Écran (285000)
      taxAmount: 317290,
      total: 1965540,
      paidAmount: 1000000,
      issueDate: invoiceDates[1],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdAt: invoiceDates[1],
      updatedAt: invoiceDates[1]
    }
  });
  await prisma.invoiceItem.create({
    data: {
      tenantId,
      invoiceId: inv2.id,
      productId: productsList[2].id, // MacBook
      quantity: 1,
      unitPrice: 1450000,
      total: 1450000,
      taxRate: 19.25
    }
  });
  await prisma.invoiceItem.create({
    data: {
      tenantId,
      invoiceId: inv2.id,
      productId: productsList[3].id, // Écran Dell
      quantity: 1,
      unitPrice: 285000,
      total: 285000,
      taxRate: 19.25
    }
  });
  // Stock Out
  for (const pIndex of [2, 3]) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: productsList[pIndex].id,
        type: "SORTIE_VENTE",
        quantity: 1,
        reason: `Facture de vente ${inv2.number}`,
        reference: inv2.number,
        unitPrice: productsList[pIndex].sellPrice,
        userId,
        invoiceId: inv2.id,
        createdAt: invoiceDates[1]
      }
    });
  }
  // Acompte payé
  await prisma.payment.create({
    data: {
      tenantId,
      invoiceId: inv2.id,
      amount: 1000000,
      method: "MOBILE_MONEY",
      reference: "OM-29382103",
      note: "Acompte de 1M par Orange Money",
      paidAt: invoiceDates[1],
      createdAt: invoiceDates[1]
    }
  });

  // Facture 3 - Impayée / En attente
  const inv3 = await prisma.invoice.create({
    data: {
      tenantId,
      number: `FAC-${new Date().getFullYear()}-003`,
      type: "FACTURE",
      status: "ENVOYE",
      customerId: customersList[1].id, // Mme Aïcha
      userId,
      discount: 0,
      subtotal: 890000, // 1x S24 Ultra
      taxAmount: 171325,
      total: 1061325,
      paidAmount: 0,
      issueDate: invoiceDates[2],
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Échue il y a 5 jours !
      createdAt: invoiceDates[2],
      updatedAt: invoiceDates[2]
    }
  });
  await prisma.invoiceItem.create({
    data: {
      tenantId,
      invoiceId: inv3.id,
      productId: productsList[1].id, // S24
      quantity: 1,
      unitPrice: 890000,
      total: 890000,
      taxRate: 19.25
    }
  });
  await prisma.stockMovement.create({
    data: {
      tenantId,
      productId: productsList[1].id,
      type: "SORTIE_VENTE",
      quantity: 1,
      reason: `Facture de vente ${inv3.number}`,
      reference: inv3.number,
      unitPrice: 890000,
      userId,
      invoiceId: inv3.id,
      createdAt: invoiceDates[2]
    }
  });

  // Facture 4 - Devis / Proforma (N'impacte pas la compta ou les stocks)
  const inv4 = await prisma.invoice.create({
    data: {
      tenantId,
      number: `PRO-${new Date().getFullYear()}-004`,
      type: "PROFORMA",
      status: "BROUILLON",
      customerId: customersList[0].id,
      userId,
      discount: 0,
      subtotal: 76000, // 20x cartons de papier A4
      taxAmount: 14630,
      total: 90630,
      paidAmount: 0,
      issueDate: invoiceDates[3],
      createdAt: invoiceDates[3],
      updatedAt: invoiceDates[3]
    }
  });
  await prisma.invoiceItem.create({
    data: {
      tenantId,
      invoiceId: inv4.id,
      productId: productsList[5].id, // Rame papier
      quantity: 20,
      unitPrice: 3800,
      total: 76000,
      taxRate: 19.25
    }
  });
  console.log("✅ Factures, mouvements de ventes et règlements créés.");

  // 8. CRÉATION DES FLUX DE TRÉSORERIE (RECETTES & DÉPENSES HORS FACTURES)
  console.log("\n💸 Création des transactions financières...");
  const transactionsData = [
    { type: "DEPENSE" as const, amount: 250000, category: "Loyer & Charges", description: "Paiement loyer des bureaux locaux", accountName: "UBA", offsetDays: 20 },
    { type: "DEPENSE" as const, amount: 45000, category: "Énergie", description: "Facture électricité Eneo", accountName: "Caisse", offsetDays: 14 },
    { type: "RECETTE" as const, amount: 150000, category: "Prestation", description: "Service d'installation réseau client", accountName: "Orange/MTN", offsetDays: 8 },
    { type: "DEPENSE" as const, amount: 120000, category: "Marketing", description: "Publicité Facebook & Google Ads", accountName: "UBA", offsetDays: 3 }
  ];

  for (const t of transactionsData) {
    await prisma.transaction.create({
      data: {
        tenantId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        accountId: accountsMap[t.accountName],
        userId,
        date: new Date(Date.now() - t.offsetDays * 24 * 60 * 60 * 1000)
      }
    });
  }
  console.log("✅ Transactions financières créées.");

  // 9. CRÉATION DES EMPLOYÉS & RESSOURCES HUMAINES
  console.log("\n👔 Création des fiches employés et salaires...");
  const employeesData = [
    { firstName: "Jean-Pierre", lastName: "Ngo", position: "Magasinier en Chef", baseSalary: 180000, startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), contractType: "CDI" as const, department: "Logistique" },
    { firstName: "Aurelie", lastName: "Mefo", position: "Commerciale / Caisse", baseSalary: 150000, startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), contractType: "CDD" as const, department: "Ventes" }
  ];

  for (const emp of employeesData) {
    const createdEmp = await prisma.employee.create({
      data: {
        ...emp,
        tenantId,
        status: "ACTIF"
      }
    });

    // Générer 2 mois de fiches de paie pour l'historique (Mars et Avril 2026)
    const payrollMonths = [
      { month: 3, year: 2026 },
      { month: 4, year: 2026 }
    ];

    for (const pm of payrollMonths) {
      await prisma.payroll.create({
        data: {
          tenantId,
          employeeId: createdEmp.id,
          month: pm.month,
          year: pm.year,
          baseSalary: emp.baseSalary,
          bonuses: pm.month === 4 ? 15000 : 0, // Bonus de 15K en Avril
          deductions: 0,
          socialCharges: emp.baseSalary * 0.042, // CNPS
          netSalary: emp.baseSalary + (pm.month === 4 ? 15000 : 0) - (emp.baseSalary * 0.042),
          status: "PAYE" as const,
          processedById: userId,
          paidAt: new Date(2026, pm.month - 1, 30) // payé le 30 du mois
        }
      });
    }
  }
  console.log("✅ Employés et fiches de paie créés.");

  console.log("\n====================================================");
  console.log("🎉 SEED DE PRÉSENTATION THABORSOLUTION RÉUSSI !");
  console.log("====================================================");
  console.log(`\nToutes les données de démonstration ont été injectées`);
  console.log(`pour votre Tenant : ${user.tenant?.name}`);
  console.log(`\nVous pouvez maintenant vous connecter en local et présenter`);
  console.log(`la totalité des fonctionnalités de l'application !`);
  console.log("====================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Une erreur est survenue lors de l'exécution du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
