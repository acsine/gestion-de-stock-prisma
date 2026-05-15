// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateStockExcel, generateInvoiceExcel, generatePayrollExcel, generateStockWord, generateInvoiceWord, generateInvoiceHTML, generatePayslipHTML, generateCustomersExcel, generateFinanceExcel, generateStockHTML, generateInvoiceListHTML, generateCustomersHTML, generateFinanceHTML } from "@/lib/reports";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type");
    const format = searchParams.get("format") || "excel"; // pdf | excel | word
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const invoiceId = searchParams.get("invoiceId");
    const payrollId = searchParams.get("payrollId");

    const baseWhere: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      baseWhere.tenantId = tenantId;
    } else if (tenantId) {
      baseWhere.tenantId = tenantId;
    }

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate), lte: new Date(endDate)
    } : undefined;

    const settings = await prisma.setting.findMany({ where: baseWhere });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    // ===== INVOICE PDF/WORD =====
    if (reportType === "invoice" && invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId, ...baseWhere },
        include: { customer: true, items: { include: { product: true } }, user: { select: { name: true } } },
      });
      if (!invoice) return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 });

      if (format === "word") {
        const buffer = await generateInvoiceWord(invoice, settingsMap);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="facture-${invoice.number}.docx"`,
          },
        });
      }

      if (format === "pdf") {
        const html = generateInvoiceHTML(invoice, settingsMap);
        // Use puppeteer server-side
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" } });
        await browser.close();
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
          },
        });
      }
    }

    // ===== PAYSLIP PDF =====
    if (reportType === "payslip" && payrollId) {
      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId, ...baseWhere },
        include: { employee: true },
      });
      if (!payroll) return NextResponse.json({ error: "Fiche de paie non trouvée" }, { status: 404 });

      const html = generatePayslipHTML(payroll, settingsMap);
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const pg = await browser.newPage();
      await pg.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await pg.pdf({ format: "A4", printBackground: true });
      await browser.close();
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="fiche-paie-${payroll.employee.firstName}-${payroll.month}-${payroll.year}.pdf"`,
        },
      });
    }

    // ===== STOCK REPORT =====
    if (reportType === "stock" || reportType === "inventory") {
      const products = await prisma.product.findMany({
        where: baseWhere,
        include: { category: true, supplier: true },
        orderBy: { name: "asc" },
      });

      if (format === "excel") {
        const buffer = await generateStockExcel(products);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="rapport-stock-${new Date().toISOString().split("T")[0]}.xlsx"`,
          },
        });
      }

      if (format === "word") {
        const buffer = await generateStockWord(products, settingsMap.company_name || "Mon Entreprise");
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="rapport-stock.docx"`,
          },
        });
      }

      if (format === "pdf") {
        const html = generateStockHTML(products, settingsMap);
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" } });
        await browser.close();
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="rapport-stock-${new Date().toISOString().split("T")[0]}.pdf"`,
          },
        });
      }
    }

    // ===== INVOICES REPORT =====
    if (reportType === "invoices" || reportType === "sales") {
      const invoices = await prisma.invoice.findMany({
        where: { ...baseWhere, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      });

      if (format === "excel") {
        const buffer = await generateInvoiceExcel(invoices);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="rapport-factures.xlsx"`,
          },
        });
      }

      if (format === "pdf") {
        const html = generateInvoiceListHTML(invoices, settingsMap);
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" } });
        await browser.close();
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="rapport-ventes.pdf"`,
          },
        });
      }
    }

    // ===== PAYROLL REPORT =====
    if (reportType === "payroll") {
      const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

      const payrolls = await prisma.payroll.findMany({
        where: { ...baseWhere, month, year },
        include: { employee: true },
      });

      if (format === "excel") {
        const buffer = await generatePayrollExcel(payrolls, month, year);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="salaires-${month}-${year}.xlsx"`,
          },
        });
      }
    }

    // ===== FINANCE REPORT =====
    if (reportType === "finance") {
      const transactions = await prisma.transaction.findMany({
        where: { ...baseWhere, ...(dateFilter ? { date: dateFilter } : {}) },
        include: { account: true },
        orderBy: { date: "desc" },
      });
      const accounts = await prisma.cashAccount.findMany({ where: baseWhere });

      if (format === "excel") {
        const buffer = await generateFinanceExcel(transactions, accounts);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="rapport-financier.xlsx"',
          },
        });
      }

      if (format === "pdf") {
        const html = generateFinanceHTML(transactions, accounts, settingsMap);
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="rapport-financier.pdf"',
          },
        });
      }
    }

    // ===== CUSTOMERS REPORT =====
    if (reportType === "customers") {
      const customers = await prisma.customer.findMany({
        where: baseWhere,
        orderBy: { name: "asc" },
      });

      if (format === "excel") {
        const buffer = await generateCustomersExcel(customers);
        return new NextResponse(buffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="liste-clients.xlsx"',
          },
        });
      }

      if (format === "pdf") {
        const html = generateCustomersHTML(customers, settingsMap);
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="liste-clients.pdf"',
          },
        });
      }
    }

    return NextResponse.json({ error: "Type de rapport non supporté" }, { status: 400 });
  } catch (error: any) {
    console.error("REPORT_API_ERROR:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur serveur",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    }, { status: 500 });
  }
}
