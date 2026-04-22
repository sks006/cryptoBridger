"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  CreditCard,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  SnowflakeIcon,
  Bell,
  TrendingUp,
  Wallet,
  Smartphone,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/cardbridger/Header";
import Footer from "@/components/cardbridger/Footer";
import HealthFactorMeter from "@/components/HealthFactorMeter";
import CardBalance from "@/components/CardBalance";
import Transactions from "@/app/dashboard/transactions";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useCardBalance } from "@/hooks/useCardBalance";
import { getMockTransactions, getMockCardState } from "@/lib/anchor-client";
import { formatCurrency, shortenAddress } from "@/lib/utils";

import { useWallet } from "@solana/wallet-adapter-react";

const MOCK_WALLET = "8xK9mBzLpQRnVwT3cY7dFhJeN2sAuXiCvMoP4gS5tEq";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || MOCK_WALLET;

  const healthFactor = useHealthFactor(walletAddress);
  const cardBalance = useCardBalance(walletAddress);
  const transactions = getMockTransactions();
  const cardState = getMockCardState();
  const monthlySpend = transactions
    .filter((t) => t.type === "purchase" && t.status === "completed")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalCashback = transactions
    .filter((t) => t.type === "cashback")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wallet:{" "}
              <span className="font-mono text-foreground">
                {shortenAddress(walletAddress)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/card">
                <SnowflakeIcon className="w-4 h-4" />
                Manage Card
              </Link>
            </Button>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/card">
                <Plus className="w-4 h-4" />
                Top Up
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Available Credit",
              value: formatCurrency(cardBalance.balance?.availableCredit ?? 0),
              change: "+$120 this month",
              positive: true,
              icon: Wallet,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Monthly Spend",
              value: formatCurrency(monthlySpend),
              change: `${((monthlySpend / 1000) * 100).toFixed(0)}% of limit`,
              positive: false,
              icon: CreditCard,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
            },
            {
              label: "Total Cashback",
              value: `+${formatCurrency(totalCashback)}`,
              change: "2% on purchases",
              positive: true,
              icon: TrendingUp,
              color: "text-yellow-400",
              bg: "bg-yellow-500/10",
            },
            {
              label: "Health Factor",
              value: healthFactor.healthFactor.toFixed(2),
              change: healthFactor.riskLabel,
              positive: healthFactor.riskLevel === "safe",
              icon: Zap,
              color: healthFactor.riskColor,
              bg: "bg-secondary",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.positive ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Mock Card Visual + Card State */}
          <div className="lg:col-span-1 space-y-4">
            {/* Card Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-xl scale-105" />
              <div
                className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #0d2137 0%, #0a2a1f 50%, #061220 100%)",
                  aspectRatio: "1.586/1",
                }}
              >
                <div className="absolute inset-0 card-shimmer" />
                <div className="relative h-full p-5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-white text-sm tracking-wider">LAMYT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cardState.isFrozen && (
                        <Badge variant="info" className="text-xs">
                          <SnowflakeIcon className="w-3 h-3 mr-1" />
                          Frozen
                        </Badge>
                      )}
                      <Badge variant={cardState.mode === "credit" ? "success" : "info"} className="text-xs">
                        {cardState.mode === "credit" ? "Credit" : "Debit"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white/80 font-mono text-sm tracking-[0.15em]">
                      {cardState.cardNumber}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Holder</p>
                        <p className="text-white text-xs font-medium">CRYPTO USER</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Exp</p>
                        <p className="text-white text-xs font-medium">{cardState.expiryDate}</p>
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-red-500/80" />
                        <div className="w-7 h-7 rounded-full bg-yellow-500/80" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Quick Info */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily Limit</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(cardState.currentDaySpend)} / {formatCurrency(cardState.spendingLimit)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${(cardState.currentDaySpend / cardState.spendingLimit) * 100}%` }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href="/card">
                      <SnowflakeIcon className="w-3.5 h-3.5" />
                      Freeze
                    </Link>
                  </Button>
                  <Button variant="gradient" size="sm" className="flex-1" asChild>
                    <Link href="/card">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Top Up
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Health Factor */}
            <HealthFactorMeter
              position={healthFactor.position}
              healthFactor={healthFactor.healthFactor}
              riskLevel={healthFactor.riskLevel}
              riskColor={healthFactor.riskColor}
              riskLabel={healthFactor.riskLabel}
              loading={healthFactor.loading}
            />
          </div>

          {/* Balance + Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <CardBalance
              totalPortfolioUsd={cardBalance.totalPortfolioUsd}
              availableCredit={cardBalance.balance?.availableCredit ?? 0}
              tokens={cardBalance.tokens}
              loading={cardBalance.loading}
              onRefresh={cardBalance.refresh}
            />

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="h-14 flex-col gap-1" asChild>
                <Link href="/swap">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-medium">Swap</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1" asChild>
                <Link href="/nfc/tap">
                  <Smartphone className="w-5 h-5 text-orange-400" />
                  <span className="text-xs font-medium">NFC Tap</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1" asChild>
                <Link href="/pos-simulator">
                  <Store className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-medium">POS Sim</span>
                </Link>
              </Button>
            </div>

            <Transactions transactions={transactions} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
