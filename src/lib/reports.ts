// src/lib/reports.ts
// Report generation: PDF (via puppeteer), Excel (via exceljs), Word (via docx)

import ExcelJS from "exceljs";
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, ShadingType, BorderStyle, ImageRun, HeadingLevel, LevelFormat
} from "docx";
import { readFileSync } from "fs";
import { join } from "path";

function getLogoBase64(logoPath?: string): string | null {
  if (!logoPath) return null;
  if (logoPath.startsWith("data:")) return logoPath;
  // If it's a local path like /uploads/logo.png
  if (logoPath.startsWith("/")) {
    try {
      const cleanPath = logoPath.slice(1);
      const absolutePath = join(process.cwd(), "public", cleanPath);
      const buffer = readFileSync(absolutePath);
      const ext = cleanPath.split(".").pop() || "png";
      return `data:image/${ext};base64,${buffer.toString("base64")}`;
    } catch (e) {
      return null;
    }
  }
  return logoPath; // If it's already an absolute URL
}

function getLogoBuffer(logoPath?: string): Buffer | null {
  if (!logoPath) return null;
  if (logoPath.startsWith("/")) {
    try {
      const absolutePath = join(process.cwd(), "public", logoPath.slice(1));
      return readFileSync(absolutePath);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ===========================
// EXCEL REPORTS
// ===========================
export async function generateStockExcel(products: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ThaborSolution Stock Manager";
  wb.created = new Date();

  const ws = wb.addWorksheet("État du Stock", { properties: { tabColor: { argb: "FF2563EB" } } });

  ws.columns = [
    { header: "SKU", key: "sku", width: 14 },
    { header: "Produit", key: "name", width: 30 },
    { header: "Catégorie", key: "category", width: 18 },
    { header: "Stock Actuel", key: "currentStock", width: 14 },
    { header: "Stock Min", key: "minStock", width: 12 },
    { header: "Stock Max", key: "maxStock", width: 12 },
    { header: "Unité", key: "unit", width: 10 },
    { header: "Prix Achat", key: "buyPrice", width: 14 },
    { header: "Prix Vente", key: "sellPrice", width: 14 },
    { header: "Valeur Stock", key: "stockValue", width: 16 },
    { header: "Statut", key: "status", width: 12 },
  ];

  // Header row style
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF2563EB" } } };
  });
  headerRow.height = 24;

  products.forEach((p, i) => {
    const stockValue = p.currentStock * p.buyPrice;
    const isLow = p.currentStock <= p.minStock;
    const isRupture = p.currentStock === 0;

    const row = ws.addRow({
      sku: p.sku,
      name: p.name,
      category: p.category?.name || "—",
      currentStock: p.currentStock,
      minStock: p.minStock,
      maxStock: p.maxStock,
      unit: p.unit,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      stockValue,
      status: isRupture ? "RUPTURE" : isLow ? "STOCK BAS" : "OK",
    });

    const bgColor = isRupture ? "FFFECACA" : isLow ? "FFFEF3C7" : i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    const statusColor = isRupture ? "FFEF4444" : isLow ? "FFF59E0B" : "FF10B981";

    row.eachCell((cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: col <= 2 ? "left" : "center" };
    });

    // Currency formatting
    ["H", "I", "J"].forEach((col) => {
      const cell = ws.getCell(`${col}${i + 2}`);
      cell.numFmt = '#,##0 "FCFA"';
    });

    // Status cell color
    const statusCell = ws.getCell(`K${i + 2}`);
    statusCell.font = { bold: true, color: { argb: statusColor }, name: "Arial", size: 10 };
  });

  // Total row
  const totalRow = ws.addRow({
    name: "TOTAL",
    stockValue: { formula: `SUM(J2:J${products.length + 1})` },
  });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, name: "Arial", size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  });

  ws.autoFilter = { from: "A1", to: "K1" };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function generateInvoiceExcel(invoices: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Factures");

  ws.columns = [
    { header: "N° Facture", key: "number", width: 16 },
    { header: "Type", key: "type", width: 12 },
    { header: "Client", key: "customer", width: 24 },
    { header: "Date", key: "date", width: 14 },
    { header: "Échéance", key: "dueDate", width: 14 },
    { header: "HT", key: "subtotal", width: 14 },
    { header: "TVA", key: "tax", width: 12 },
    { header: "TTC", key: "total", width: 14 },
    { header: "Payé", key: "paid", width: 12 },
    { header: "Reste", key: "remaining", width: 12 },
    { header: "Statut", key: "status", width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 24;

  invoices.forEach((inv, i) => {
    const statusColors: Record<string, string> = {
      PAYE: "FF10B981", BROUILLON: "FF94A3B8", ANNULE: "FFEF4444",
      PARTIELLEMENT_PAYE: "FFF59E0B", ENVOYE: "FF3B82F6",
    };
    const row = ws.addRow({
      number: inv.number,
      type: inv.type,
      customer: inv.customer?.name,
      date: new Date(inv.issueDate).toLocaleDateString("fr-FR"),
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-FR") : "—",
      subtotal: inv.subtotal,
      tax: inv.taxAmount,
      total: inv.total,
      paid: inv.paidAmount,
      remaining: inv.total - inv.paidAmount,
      status: inv.status,
    });

    const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle" };
    });
    ["F","G","H","I","J"].forEach((col) => {
      ws.getCell(`${col}${i + 2}`).numFmt = '#,##0 "FCFA"';
    });
    const sc = ws.getCell(`K${i + 2}`);
    sc.font = { bold: true, color: { argb: statusColors[inv.status] || "FF64748B" }, name: "Arial", size: 10 };
  });

  // Totals row
  const totalRow = ws.addRow({
    customer: "TOTAL GÉNÉRAL",
    subtotal: { formula: `SUM(F2:F${invoices.length + 1})` },
    tax: { formula: `SUM(G2:G${invoices.length + 1})` },
    total: { formula: `SUM(H2:H${invoices.length + 1})` },
    paid: { formula: `SUM(I2:I${invoices.length + 1})` },
    remaining: { formula: `SUM(J2:J${invoices.length + 1})` },
  });
  totalRow.eachCell(c => {
    c.font = { bold: true, name: "Arial", size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  });

  ws.autoFilter = { from: "A1", to: "K1" };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function generatePayrollExcel(payrolls: any[], month: number, year: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const ws = wb.addWorksheet(`Salaires ${monthNames[month - 1]} ${year}`);

  ws.columns = [
    { header: "Employé", key: "employee", width: 24 },
    { header: "Poste", key: "position", width: 20 },
    { header: "Salaire Base", key: "base", width: 14 },
    { header: "Primes", key: "bonuses", width: 12 },
    { header: "Retenues", key: "deductions", width: 12 },
    { header: "Charges Sociales", key: "social", width: 18 },
    { header: "Salaire Net", key: "net", width: 14 },
    { header: "Statut", key: "status", width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 24;

  let totalBase = 0, totalNet = 0;
  payrolls.forEach((p, i) => {
    totalBase += p.baseSalary;
    totalNet += p.netSalary;
    const row = ws.addRow({
      employee: `${p.employee.firstName} ${p.employee.lastName}`,
      position: p.employee.position,
      base: p.baseSalary,
      bonuses: p.bonuses,
      deductions: p.deductions,
      social: p.socialCharges,
      net: p.netSalary,
      status: p.status,
    });
    const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: "Arial", size: 10 };
    });
    ["C","D","E","F","G"].forEach((col) => {
      ws.getCell(`${col}${i + 2}`).numFmt = '#,##0 "FCFA"';
    });
  });

  const totalRow = ws.addRow({ employee: "TOTAL MASSE SALARIALE", base: totalBase, net: totalNet });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, name: "Arial", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  });

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function generateCustomersExcel(customers: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clients");

  ws.columns = [
    { header: "Nom", key: "name", width: 24 },
    { header: "Type", key: "type", width: 14 },
    { header: "Téléphone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Ville", key: "city", width: 14 },
    { header: "Solde (Credit)", key: "balance", width: 16 },
    { header: "Limite Crédit", key: "creditLimit", width: 16 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  customers.forEach((c, i) => {
    const row = ws.addRow({
      name: c.name,
      type: c.type,
      phone: c.phone || "—",
      email: c.email || "—",
      city: c.city || "—",
      balance: c.balance,
      creditLimit: c.creditLimit,
    });
    const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: "Arial", size: 10 };
    });
    ["F", "G"].forEach((col) => {
      ws.getCell(`${col}${i + 2}`).numFmt = '#,##0 "FCFA"';
    });
  });

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function generateFinanceExcel(transactions: any[], accounts: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  
  // Accounts Summary Sheet
  const wsAcc = wb.addWorksheet("Comptes & Soldes");
  wsAcc.columns = [
    { header: "Compte", key: "name", width: 20 },
    { header: "Type", key: "type", width: 15 },
    { header: "Solde Actuel", key: "balance", width: 18 },
  ];
  const h1 = wsAcc.getRow(1);
  h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
  h1.font = { bold: true, color: { argb: "FFFFFFFF" } };
  
  accounts.forEach(a => {
    wsAcc.addRow({ name: a.name, type: a.type, balance: a.balance });
  });

  // Transactions Sheet
  const wsTx = wb.addWorksheet("Transactions");
  wsTx.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 12 },
    { header: "Catégorie", key: "category", width: 16 },
    { header: "Compte", key: "account", width: 16 },
    { header: "Description", key: "description", width: 30 },
    { header: "Montant", key: "amount", width: 14 },
  ];
  
  const h2 = wsTx.getRow(1);
  h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C5E" } };
  h2.font = { bold: true, color: { argb: "FFFFFFFF" } };

  let totalRecettes = 0;
  let totalDepenses = 0;

  transactions.forEach((t, i) => {
    if (t.type === "RECETTE") totalRecettes += (t.amount || 0);
    if (t.type === "DEPENSE") totalDepenses += (t.amount || 0);

    const row = wsTx.addRow({
      date: new Date(t.date).toLocaleDateString("fr-FR"),
      type: t.type,
      category: t.category,
      account: t.account?.name || "—",
      description: t.description || "—",
      amount: t.amount,
    });
    if (t.type === "DEPENSE") {
      wsTx.getCell(`F${i + 2}`).font = { color: { argb: "FFEF4444" } };
    } else {
      wsTx.getCell(`F${i + 2}`).font = { color: { argb: "FF10B981" } };
    }
  });

  // Totals
  wsTx.addRow([]);
  const r1 = wsTx.addRow({ description: "TOTAL RECETTES", amount: totalRecettes });
  r1.getCell("E").font = { bold: true };
  r1.getCell("F").font = { bold: true, color: { argb: "FF10B981" } };
  
  const r2 = wsTx.addRow({ description: "TOTAL DÉPENSES", amount: totalDepenses });
  r2.getCell("E").font = { bold: true };
  r2.getCell("F").font = { bold: true, color: { argb: "FFEF4444" } };
  
  const r3 = wsTx.addRow({ description: "SOLDE NET", amount: totalRecettes - totalDepenses });
  r3.getCell("E").font = { bold: true };
  r3.getCell("F").font = { bold: true, color: { argb: "FF1A3C5E" } };
  r3.eachCell(c => c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } });

  wsTx.getColumn("F").numFmt = '#,##0 "FCFA"';

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ===========================
// WORD REPORTS
// ===========================
export async function generateStockWord(products: any[], companyName: string): Promise<Buffer> {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const tableRows = [
    new TableRow({
      children: ["SKU","Produit","Catégorie","Stock","Min","Prix Vente","Valeur","Statut"].map(h =>
        new TableCell({
          borders,
          shading: { fill: "1A3C5E", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18, font: "Arial" })] })]
        })
      )
    }),
    ...products.map((p, i) => new TableRow({
      children: [
        p.sku, p.name, p.category?.name || "—",
        String(p.currentStock), String(p.minStock),
        `${p.sellPrice.toLocaleString("fr-FR")} FCFA`,
        `${(p.currentStock * p.buyPrice).toLocaleString("fr-FR")} FCFA`,
        p.currentStock === 0 ? "RUPTURE" : p.currentStock <= p.minStock ? "STOCK BAS" : "OK"
      ].map(text => new TableCell({
        borders,
        shading: { fill: i % 2 === 0 ? "FFFFFF" : "F8FAFC", type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: "Arial" })] })]
      }))
    }))
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 16838, height: 11906 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `${companyName} — Rapport de Stock`, font: "Arial", size: 32, bold: true, color: "1A3C5E" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: `Édité le ${new Date().toLocaleDateString("fr-FR")}`, font: "Arial", size: 20, color: "64748B" })]
        }),
        new Table({
          width: { size: 14838, type: WidthType.DXA },
          columnWidths: [1400, 2800, 1800, 1200, 1000, 1800, 1800, 1300] as number[],
          rows: tableRows
        }),
      ]
    }]
  });

  return Packer.toBuffer(doc) as unknown as Promise<Buffer>;
}

export async function generateInvoiceWord(invoice: any, settings: Record<string, string>): Promise<Buffer> {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const logoBuffer = getLogoBuffer(settings.company_logo);

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children: [
        // Header: Company info
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [5000, 4026],
          rows: [new TableRow({
            children: [
              new TableCell({
                borders: noBorders,
                children: [
                  logoBuffer ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 120, height: 60 },
                      } as any),
                    ],
                  }) : new Paragraph({ children: [] }),
                  new Paragraph({ children: [new TextRun({ text: settings.company_name || "Mon Entreprise", font: "Arial", size: 28, bold: true, color: "1A3C5E" })] }),
                  new Paragraph({ children: [new TextRun({ text: settings.company_address || "", font: "Arial", size: 20, color: "64748B" })] }),
                  new Paragraph({ children: [new TextRun({ text: settings.company_phone || "", font: "Arial", size: 20, color: "64748B" })] }),
                  new Paragraph({ children: [new TextRun({ text: settings.company_email || "", font: "Arial", size: 20, color: "64748B" })] }),
                ]
              }),
              new TableCell({
                borders: noBorders,
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: invoice.type, font: "Arial", size: 36, bold: true, color: "2563EB" })] }),
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `N° ${invoice.number}`, font: "Arial", size: 24, bold: true, color: "1A3C5E" })] }),
                  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Date: ${new Date(invoice.issueDate).toLocaleDateString("fr-FR")}`, font: "Arial", size: 20 })] }),
                  invoice.dueDate ? new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Échéance: ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}`, font: "Arial", size: 20, color: "EF4444" })] }) : new Paragraph({ children: [] }),
                ]
              })
            ]
          })]
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // Client info
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [9026],
          rows: [
            new TableRow({ children: [new TableCell({ borders, shading: { fill: "DBEAFE", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [
              new Paragraph({ children: [new TextRun({ text: "FACTURÉ À :", font: "Arial", size: 18, bold: true, color: "1A3C5E" })] }),
              new Paragraph({ children: [new TextRun({ text: invoice.customer?.name || "", font: "Arial", size: 22, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: invoice.customer?.phone || "", font: "Arial", size: 20, color: "64748B" })] }),
            ] })] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // Items table
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3800, 1000, 1400, 800, 1000, 1026],
          rows: [
            new TableRow({ children: ["Description","Qté","Prix Unit.","Remise","TVA","Total"].map(h => new TableCell({
              borders, shading: { fill: "1A3C5E", type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18, font: "Arial" })] })]
            })) }),
            ...(invoice.items || []).map((item: any, i: number) => new TableRow({
              children: [
                item.product?.name || item.description || "—",
                item.quantity.toString(),
                `${item.unitPrice.toLocaleString("fr-FR")} F`,
                `${item.discount}%`,
                `${item.taxRate}%`,
                `${item.total.toLocaleString("fr-FR")} F`,
              ].map((text, ci) => new TableCell({
                borders,
                shading: { fill: i % 2 === 0 ? "FFFFFF" : "F8FAFC", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ alignment: ci > 0 ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text, size: 18, font: "Arial" })] })]
              }))
            }))
          ]
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // Totals
        new Table({
          width: { size: 4000, type: WidthType.DXA },
          columnWidths: [2000, 2000],
          rows: [
            ["Sous-total HT", `${invoice.subtotal.toLocaleString("fr-FR")} FCFA`],
            ["TVA", `${invoice.taxAmount.toLocaleString("fr-FR")} FCFA`],
            ["TOTAL TTC", `${invoice.total.toLocaleString("fr-FR")} FCFA`],
            ["Montant payé", `${invoice.paidAmount.toLocaleString("fr-FR")} FCFA`],
            ["Reste à payer", `${(invoice.total - invoice.paidAmount).toLocaleString("fr-FR")} FCFA`],
          ].map(([label, value], i) => new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: i === 2 ? "1A3C5E" : i % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: i === 2, color: i === 2 ? "FFFFFF" : "334155", size: 20, font: "Arial" })] })] }),
              new TableCell({ borders, shading: { fill: i === 2 ? "2563EB" : i % 2 === 0 ? "F8FAFC" : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, bold: i === 2, color: i === 2 ? "FFFFFF" : "1A3C5E", size: i === 2 ? 24 : 20, font: "Arial" })] })] }),
            ]
          }))
        }),

        invoice.notes ? new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `Notes: ${invoice.notes}`, font: "Arial", size: 18, color: "64748B", italics: true })] }) : new Paragraph({ children: [] }),
      ]
    }]
  });

  return Packer.toBuffer(doc) as unknown as Promise<Buffer>;
}

// ===========================
// PDF via HTML template (for puppeteer on server)
// ===========================
export function generateInvoiceHTML(invoice: any, settings: Record<string, string>): string {
  const logoBase64 = getLogoBase64(settings.company_logo);
  const items = (invoice.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.product?.name || item.description || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity} ${item.product?.unit || ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${item.unitPrice.toLocaleString("fr-FR")} FCFA</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.discount}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.taxRate}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${item.total.toLocaleString("fr-FR")} FCFA</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; color:#1e293b; background:#fff; padding:40px; font-size:13px; }
    .header { display:flex; justify-content:space-between; margin-bottom:32px; }
    .company-name { font-size:22px; font-weight:800; color:#1a3c5e; }
    .company-info { color:#64748b; font-size:12px; line-height:1.8; }
    .invoice-title { font-size:28px; font-weight:800; color:#2563eb; text-align:right; }
    .invoice-number { font-size:16px; font-weight:700; color:#1a3c5e; text-align:right; }
    .invoice-meta { font-size:12px; color:#64748b; text-align:right; }
    .client-box { background:#dbeafe; border-radius:8px; padding:16px; margin-bottom:24px; }
    .client-label { font-size:11px; font-weight:700; color:#1a3c5e; text-transform:uppercase; margin-bottom:4px; }
    .client-name { font-size:15px; font-weight:700; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    thead tr { background:#1a3c5e; color:#fff; }
    thead th { padding:10px 12px; text-align:left; font-size:12px; }
    thead th:not(:first-child) { text-align:center; }
    thead th:last-child { text-align:right; }
    tbody tr:nth-child(even) { background:#f8fafc; }
    .totals { display:flex; justify-content:flex-end; }
    .totals-table { width:320px; border-collapse:collapse; }
    .totals-table td { padding:8px 12px; font-size:13px; }
    .totals-table .total-row { background:#1a3c5e; color:#fff; font-weight:700; font-size:15px; }
    .totals-table .total-row td { padding:12px; }
    .footer { margin-top:40px; text-align:center; color:#94a3b8; font-size:11px; border-top:1px solid #e2e8f0; padding-top:16px; }
  </style></head><body>
  <div class="header">
    <div style="display:flex; gap:16px; align-items:start;">
      ${logoBase64 ? `<img src="${logoBase64}" style="max-height:80px; max-width:180px; object-fit:contain;" />` : ""}
      <div>
        <div class="company-name">${settings.company_name || "Mon Entreprise"}</div>
        <div class="company-info">
          ${settings.company_address || ""}<br>
          ${settings.company_phone || ""} | ${settings.company_email || ""}
        </div>
      </div>
    </div>
    <div>
      <div class="invoice-title">${invoice.type}</div>
      <div class="invoice-number">N° ${invoice.number}</div>
      <div class="invoice-meta">Date: ${new Date(invoice.issueDate).toLocaleDateString("fr-FR")}</div>
      ${invoice.dueDate ? `<div class="invoice-meta" style="color:#ef4444;">Échéance: ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}</div>` : ""}
    </div>
  </div>
  <div class="client-box">
    <div class="client-label">Facturé à</div>
    <div class="client-name">${invoice.customer?.name || ""}</div>
    <div style="color:#64748b;font-size:12px;">${invoice.customer?.phone || ""} ${invoice.customer?.email ? "| " + invoice.customer.email : ""}</div>
    <div style="color:#64748b;font-size:12px;">${invoice.customer?.address || ""}</div>
  </div>
  <table>
    <thead><tr>
      <th>Description</th><th>Qté</th><th style="text-align:right">Prix Unit.</th>
      <th>Remise</th><th>TVA</th><th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="totals">
    <table class="totals-table">
      <tr><td>Sous-total HT</td><td style="text-align:right">${invoice.subtotal.toLocaleString("fr-FR")} FCFA</td></tr>
      <tr style="background:#f8fafc"><td>TVA</td><td style="text-align:right">${invoice.taxAmount.toLocaleString("fr-FR")} FCFA</td></tr>
      <tr class="total-row"><td>TOTAL TTC</td><td style="text-align:right">${invoice.total.toLocaleString("fr-FR")} FCFA</td></tr>
      <tr><td>Payé</td><td style="text-align:right">${invoice.paidAmount.toLocaleString("fr-FR")} FCFA</td></tr>
      <tr style="background:#fef3c7"><td><b>Reste à payer</b></td><td style="text-align:right;font-weight:700;color:#d97706">${(invoice.total - invoice.paidAmount).toLocaleString("fr-FR")} FCFA</td></tr>
    </table>
  </div>
  ${invoice.notes ? `<div style="margin-top:24px;color:#64748b;font-style:italic;font-size:12px;">Notes: ${invoice.notes}</div>` : ""}
  <div class="footer">
    ${settings.company_name || ""} — Merci de votre confiance
  </div>
</body></html>`;
}

export function generateStockHTML(products: any[], settings: Record<string, string>): string {
  const rows = products.map(p => `
    <tr>
      <td>${p.sku}</td>
      <td>${p.name}</td>
      <td>${p.category?.name || "—"}</td>
      <td style="text-align:center;">${p.currentStock} ${p.unit}</td>
      <td style="text-align:right;">${(p.sellPrice || 0).toLocaleString("fr-FR")} F</td>
      <td style="text-align:right;">${((p.currentStock || 0) * (p.buyPrice || 0)).toLocaleString("fr-FR")} F</td>
      <td style="text-align:center;font-weight:700;color:${p.currentStock === 0 ? "#ef4444" : p.currentStock <= p.minStock ? "#f59e0b" : "#10b981"}">
        ${p.currentStock === 0 ? "RUPTURE" : p.currentStock <= p.minStock ? "STOCK BAS" : "OK"}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family:Arial,sans-serif; color:#1e293b; padding:30px; font-size:12px; }
    h1 { color:#1a3c5e; text-align:center; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; margin-top:20px; }
    th { background:#1a3c5e; color:#fff; padding:10px; text-align:left; }
    td { padding:8px; border-bottom:1px solid #e2e8f0; }
    tr:nth-child(even) { background:#f8fafc; }
    .header-meta { text-align:center; color:#64748b; margin-bottom:30px; }
  </style></head><body>
    <h1>Rapport d'État des Stocks</h1>
    <div class="header-meta">${settings.company_name || "Mon Entreprise"} - Le ${new Date().toLocaleDateString("fr-FR")}</div>
    <table>
      <thead><tr><th>SKU</th><th>Produit</th><th>Catégorie</th><th>Stock</th><th>Prix Vente</th><th>Valeur Stock</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
}

export function generateInvoiceListHTML(invoices: any[], settings: Record<string, string>): string {
  const rows = invoices.map(inv => `
    <tr>
      <td>${inv.number}</td>
      <td>${inv.customer?.name || "—"}</td>
      <td>${new Date(inv.issueDate).toLocaleDateString("fr-FR")}</td>
      <td style="text-align:right;">${(inv.total || 0).toLocaleString("fr-FR")} F</td>
      <td style="text-align:right;">${(inv.paidAmount || 0).toLocaleString("fr-FR")} F</td>
      <td style="text-align:center;">${inv.status}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family:Arial,sans-serif; color:#1e293b; padding:30px; font-size:12px; }
    h1 { color:#1a3c5e; text-align:center; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#1a3c5e; color:#fff; padding:10px; text-align:left; }
    td { padding:8px; border-bottom:1px solid #e2e8f0; }
    tr:nth-child(even) { background:#f8fafc; }
  </style></head><body>
    <h1>Rapport des Ventes</h1>
    <div style="text-align:center;margin-bottom:20px;">${settings.company_name || ""} - État du ${new Date().toLocaleDateString("fr-FR")}</div>
    <table>
      <thead><tr><th>N° Facture</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Payé</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
}

export function generateCustomersHTML(customers: any[], settings: Record<string, string>): string {
  const rows = customers.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.type}</td>
      <td>${c.phone || "—"}</td>
      <td>${c.city || "—"}</td>
      <td style="text-align:right;">${(c.balance || 0).toLocaleString("fr-FR")} F</td>
      <td style="text-align:right;">${(c.creditLimit || 0).toLocaleString("fr-FR")} F</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family:Arial,sans-serif; color:#1e293b; padding:30px; font-size:12px; }
    h1 { color:#1a3c5e; text-align:center; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#1a3c5e; color:#fff; padding:10px; text-align:left; }
    td { padding:8px; border-bottom:1px solid #e2e8f0; }
  </style></head><body>
    <h1>Fichier Clients</h1>
    <div style="text-align:center;margin-bottom:20px;">${settings.company_name || ""}</div>
    <table>
      <thead><tr><th>Nom</th><th>Type</th><th>Téléphone</th><th>Ville</th><th>Solde</th><th>Limite Crédit</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
}

export function generateFinanceHTML(transactions: any[], accounts: any[], settings: Record<string, string>): string {
  const accRows = accounts.map(a => `
    <tr><td>${a.name}</td><td>${a.type}</td><td style="text-align:right;font-weight:700;">${(a.balance || 0).toLocaleString("fr-FR")} F</td></tr>
  `).join("");

  let totalRecettes = 0;
  let totalDepenses = 0;
  transactions.forEach(t => {
    if (t.type === "RECETTE") totalRecettes += (t.amount || 0);
    if (t.type === "DEPENSE") totalDepenses += (t.amount || 0);
  });

  const txRows = transactions.map(t => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString("fr-FR")}</td>
      <td style="color:${t.type === "DEPENSE" ? "#ef4444" : "#10b981"}">${t.type}</td>
      <td>${t.category}</td>
      <td>${t.account?.name || "—"}</td>
      <td style="text-align:right;">${(t.amount || 0).toLocaleString("fr-FR")} F</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family:Arial,sans-serif; color:#1e293b; padding:30px; font-size:12px; }
    h1 { color:#1a3c5e; text-align:center; }
    section { margin-top:30px; }
    h2 { color:#2563eb; font-size:16px; border-bottom:2px solid #dbeafe; padding-bottom:5px; }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    th { background:#1a3c5e; color:#fff; padding:10px; text-align:left; }
    td { padding:8px; border-bottom:1px solid #e2e8f0; }
    .summary-grid { display:flex; gap:20px; margin-top:20px; }
    .summary-card { flex: 1; padding:15px; border-radius:8px; border:1px solid #e2e8f0; text-align:center; }
    .summary-label { font-size:10px; text-transform:uppercase; color:#64748b; font-weight:700; }
    .summary-value { font-size:18px; font-weight:800; margin-top:5px; }
  </style></head><body>
    <h1>État Financier Global</h1>
    <div style="text-align:center;">${settings.company_name || ""} - Le ${new Date().toLocaleDateString("fr-FR")}</div>
    
    <div class="summary-grid">
      <div class="summary-card" style="background:#f0fdf4; border-color:#bbf7d0;">
        <div class="summary-label">Total Recettes</div>
        <div class="summary-value" style="color:#16a34a;">+ ${totalRecettes.toLocaleString("fr-FR")} F</div>
      </div>
      <div class="summary-card" style="background:#fef2f2; border-color:#fecaca;">
        <div class="summary-label">Total Dépenses</div>
        <div class="summary-value" style="color:#dc2626;">- ${totalDepenses.toLocaleString("fr-FR")} F</div>
      </div>
      <div class="summary-card" style="background:#eff6ff; border-color:#bfdbfe;">
        <div class="summary-label">Solde Net</div>
        <div class="summary-value" style="color:#2563eb;">${(totalRecettes - totalDepenses).toLocaleString("fr-FR")} F</div>
      </div>
    </div>

    <section>
      <h2>Résumé des Comptes</h2>
      <table>
        <thead><tr><th>Compte</th><th>Type</th><th>Solde Actuel</th></tr></thead>
        <tbody>${accRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Dernières Transactions</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Compte</th><th>Montant</th></tr></thead>
        <tbody>${txRows}</tbody>
      </table>
    </section>
  </body></html>`;
}

export function generatePayslipHTML(payroll: any, settings: Record<string, string>): string {
  const logoBase64 = getLogoBase64(settings.company_logo);
  const emp = payroll.employee;
  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; color:#1e293b; background:#fff; padding:32px; font-size:13px; }
    .header { display:flex; justify-content:space-between; border-bottom:3px solid #2563eb; padding-bottom:16px; margin-bottom:20px; }
    .company-name { font-size:20px; font-weight:800; color:#1a3c5e; }
    .payslip-title { font-size:22px; font-weight:700; color:#2563eb; }
    .period { font-size:14px; color:#64748b; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
    .info-box { background:#f8fafc; border-radius:6px; padding:12px; }
    .info-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px; }
    .info-value { font-size:14px; font-weight:600; color:#1a3c5e; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#1a3c5e; color:#fff; padding:8px 12px; text-align:left; font-size:12px; }
    td { padding:8px 12px; border-bottom:1px solid #e2e8f0; }
    tr:nth-child(even) td { background:#f8fafc; }
    .net-box { background:#1a3c5e; color:#fff; border-radius:8px; padding:20px; text-align:center; margin-top:16px; }
    .net-label { font-size:14px; opacity:.8; }
    .net-amount { font-size:32px; font-weight:800; margin-top:4px; }
    .signature-area { display:flex; justify-content:space-between; margin-top:32px; }
    .sig-box { text-align:center; width:180px; }
    .sig-line { border-top:1px solid #94a3b8; margin-top:40px; padding-top:8px; font-size:11px; color:#64748b; }
  </style></head><body>
  <div class="header">
    <div style="display:flex; gap:12px; align-items:center;">
      ${logoBase64 ? `<img src="${logoBase64}" style="max-height:60px; max-width:140px; object-fit:contain;" />` : ""}
      <div>
        <div class="company-name">${settings.company_name || "Mon Entreprise"}</div>
        <div style="color:#64748b;font-size:12px;">${settings.company_address || ""}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="payslip-title">BULLETIN DE PAIE</div>
      <div class="period">${monthNames[payroll.month - 1]} ${payroll.year}</div>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Employé</div>
      <div class="info-value">${emp.firstName} ${emp.lastName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Poste</div>
      <div class="info-value">${emp.position}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Type de contrat</div>
      <div class="info-value">${emp.contractType}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Date d'embauche</div>
      <div class="info-value">${new Date(emp.startDate).toLocaleDateString("fr-FR")}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Désignation</th><th style="text-align:right">Gain (FCFA)</th><th style="text-align:right">Retenue (FCFA)</th></tr></thead>
    <tbody>
      <tr><td>Salaire de base</td><td style="text-align:right">${payroll.baseSalary.toLocaleString("fr-FR")}</td><td></td></tr>
      ${payroll.bonuses > 0 ? `<tr><td>Primes et avantages</td><td style="text-align:right">${payroll.bonuses.toLocaleString("fr-FR")}</td><td></td></tr>` : ""}
      ${payroll.socialCharges > 0 ? `<tr><td>Charges sociales (${settings.social_charges_rate || "17.5"}%)</td><td></td><td style="text-align:right">${payroll.socialCharges.toLocaleString("fr-FR")}</td></tr>` : ""}
      ${payroll.deductions > 0 ? `<tr><td>Autres retenues</td><td></td><td style="text-align:right">${payroll.deductions.toLocaleString("fr-FR")}</td></tr>` : ""}
      <tr style="background:#f0f9ff"><td><strong>Total gains</strong></td><td style="text-align:right;font-weight:700">${(payroll.baseSalary + payroll.bonuses).toLocaleString("fr-FR")}</td><td style="text-align:right;font-weight:700">${(payroll.socialCharges + payroll.deductions).toLocaleString("fr-FR")}</td></tr>
    </tbody>
  </table>
  <div class="net-box">
    <div class="net-label">SALAIRE NET À PAYER</div>
    <div class="net-amount">${payroll.netSalary.toLocaleString("fr-FR")} FCFA</div>
  </div>
  <div class="signature-area">
    <div class="sig-box"><div class="sig-line">Signature Employé</div></div>
    <div class="sig-box"><div class="sig-line">Signature Employeur</div></div>
  </div>
</body></html>`;
}
