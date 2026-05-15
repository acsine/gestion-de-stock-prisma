// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const tenantId = (session.user as any).tenantId;
    const isSuper = (session.user as any).isSuperAdmin;

    // Use empty where clause for superadmin to see global stats, 
    // or filter by tenantId if provided (for potential impersonation)
    const baseWhere: any = {};
    if (!isSuper) {
      if (!tenantId) return NextResponse.json({ error: "Tenant non identifié" }, { status: 400 });
      baseWhere.tenantId = tenantId;
    } else if (tenantId) {
      baseWhere.tenantId = tenantId;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalProducts, alertCount, ruptureCount,
      products, monthInvoices, todayInvoices,
      recentInvoices, allInvoices, allTransactions
    ] = await Promise.all([
      prisma.product.count({ where: { ...baseWhere, status: "ACTIF" } }),
      prisma.alert.count({ where: { ...baseWhere, isRead: false } }),
      prisma.product.count({ where: { ...baseWhere, currentStock: 0, status: "ACTIF" } }),
      prisma.product.findMany({ where: baseWhere, select: { currentStock: true, buyPrice: true, sellPrice: true } }),
      prisma.invoice.findMany({ where: { ...baseWhere, type: "FACTURE", createdAt: { gte: startOfMonth } }, select: { total: true, paidAmount: true } }),
      prisma.invoice.findMany({ where: { ...baseWhere, type: "FACTURE", createdAt: { gte: startOfDay } }, select: { total: true, number: true } }),
      prisma.invoice.findMany({
        where: { ...baseWhere, type: "FACTURE" },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      // For 6 months chart
      prisma.invoice.findMany({
        where: { ...baseWhere, type: "FACTURE", status: { not: "ANNULE" }, createdAt: { gte: sixMonthsAgo } },
        select: { total: true, createdAt: true }
      }),
      prisma.transaction.findMany({
        where: { ...baseWhere, date: { gte: sixMonthsAgo } },
        select: { amount: true, type: true, date: true }
      })
    ]);

    const totalStockValue = products.reduce((sum, p) => sum + p.currentStock * p.buyPrice, 0);
    const monthRevenue = monthInvoices.reduce((sum, i) => sum + i.total, 0); // CA is total of invoices
    const currentMonthExpenses = allTransactions
      .filter(tx => tx.type === "DEPENSE" && tx.date >= startOfMonth)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const pendingInvoices = monthInvoices.filter((i) => i.total > i.paidAmount).length;

    // Build 6 months data
    const monthlyRevenue: { month: string; revenue: number; expenses: number }[] = [];
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthStr = monthNames[m];

      const rev = allInvoices
        .filter(inv => inv.createdAt.getMonth() === m && inv.createdAt.getFullYear() === y)
        .reduce((sum, inv) => sum + inv.total, 0);

      const exp = allTransactions
        .filter(tx => tx.type === "DEPENSE" && tx.date.getMonth() === m && tx.date.getFullYear() === y)
        .reduce((sum, tx) => sum + tx.amount, 0);

      monthlyRevenue.push({ month: monthStr, revenue: rev, expenses: exp });
    }

    // Trend calculation (vs previous month)
    const currentMonthRev = monthlyRevenue[5].revenue;
    const prevMonthRev = monthlyRevenue[4].revenue;
    const revenueTrend = prevMonthRev > 0 
      ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) 
      : 0;

    return NextResponse.json({
      data: {
        totalProducts,
        alertCount,
        ruptures: ruptureCount,
        totalStockValue,
        monthRevenue,
        monthExpenses: currentMonthExpenses,
        monthProfit: monthRevenue - currentMonthExpenses,
        revenueTrend,
        pendingInvoices,
        todayInvoices: todayInvoices.length,
        todaySales: todayInvoices.reduce((sum, i) => sum + i.total, 0),
        recentInvoices,
        monthlyRevenue,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
