import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  CreditCard,
  Globe,
  RefreshCw,
  ChevronRight,
  Star,
  Lock,
  Percent,
  Wallet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/cardbridger/Header";
import Footer from "@/components/cardbridger/Footer";

const features = [
  {
    icon: CreditCard,
    title: "Credit & Debit Mode",
    description:
      "Switch between spending your crypto directly or using it as collateral to get a credit line — all with a single tap.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    icon: Percent,
    title: "2% Cashback Rewards",
    description:
      "Earn up to 2% cashback in crypto on every purchase made in Credit Mode. Rewards paid daily.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: TrendingUp,
    title: "Earn While You Spend",
    description:
      "Your unspent collateral keeps earning interest daily. Your crypto works for you 24/7.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Shield,
    title: "Non-Custodial Security",
    description:
      "Your keys, your crypto. Backed by Anchor smart contracts on Solana with real-time liquidation protection.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    icon: Globe,
    title: "Spend Anywhere",
    description:
      "Accepted at 100M+ merchants worldwide. Apple Pay and Google Pay supported.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: RefreshCw,
    title: "Instant Jupiter Swaps",
    description:
      "Best-rate swaps powered by Jupiter DEX aggregator. Swap any Solana token in seconds.",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
  {
    icon: Smartphone,
    title: "Tap to Pay (NFC)",
    description:
      "Use your phone like a physical card. Secure contactless payments powered by JIT liquidity swaps.",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
];

const steps = [
  {
    step: "01",
    title: "Connect Your Wallet",
    description: "Link your Solana wallet in one click. No KYC required to get started.",
  },
  {
    step: "02",
    title: "Deposit Collateral",
    description: "Deposit SOL or any supported token as collateral to unlock your credit line.",
  },
  {
    step: "03",
    title: "Activate Your Card",
    description: "Get your virtual CardBridger Card instantly and start spending worldwide.",
  },
  {
    step: "04",
    title: "Spend & Earn",
    description: "Use your card anywhere. Earn cashback and interest on every transaction.",
  },
];

const stats = [
  { value: "$2.1B+", label: "Total Value Locked" },
  { value: "180K+", label: "Active Cards" },
  { value: "100M+", label: "Merchants Worldwide" },
  { value: "13%", label: "Max APY on Collateral" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col animated-gradient">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-36 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -top-20 right-20 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-emerald-500/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="info" className="mb-6 text-sm px-4 py-1.5">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Powered by Solana &amp; Jupiter DEX
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
                One card built for{" "}
                <span className="gradient-text">crypto wealth</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Spend without selling. Borrow against your crypto. Earn 2%
                cashback and daily interest — all from your Solana wallet.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gradient" size="xl" asChild>
                  <Link href="/dashboard">
                    Get Your Card <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link href="/nfc/tap">
                    Tap to Pay <Smartphone className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Non-custodial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Instant virtual card</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>No monthly fees</span>
                </div>
              </div>
            </div>

            {/* Mock Card Visual */}
            <div className="mt-20 flex justify-center">
              <div className="relative w-full max-w-sm">
                {/* Card back glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-2xl scale-110" />

                {/* The card */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[1.586/1]"
                  style={{
                    background: "linear-gradient(135deg, #0d2137 0%, #0a2a1f 50%, #061220 100%)"
                  }}
                >
                  <div className="absolute inset-0 card-shimmer" />

                  {/* Card content */}
                  <div className="relative h-full p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-bold text-white tracking-wider">CardBridger</span>
                      </div>
                      {/* Chip */}
                      <div className="w-10 h-8 rounded-md border border-white/20 bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-0.5 w-5 h-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-yellow-400/40 rounded-sm" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-white/80 font-mono text-base tracking-[0.2em]">
                        **** **** **** 4291
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Card Holder</p>
                          <p className="text-white text-sm font-medium">CRYPTO USER</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Expires</p>
                          <p className="text-white text-sm font-medium">09/28</p>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-red-500/80" />
                          <div className="w-8 h-8 rounded-full bg-yellow-500/80" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold gradient-text">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="success" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful benefits, no matter how you spend
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                CardBridger combines the best of DeFi with everyday spending convenience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className={`border ${feature.bg} hover:scale-[1.02] transition-transform duration-200`}
                  >
                    <CardContent className="p-6">
                      <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${feature.bg}`}>
                        <Icon className={`w-5 h-5 ${feature.color}`} />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="info" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start spending in minutes
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Connect your wallet, deposit collateral, and activate your virtual card instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, idx) => (
                <div key={step.step} className="relative">
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-full w-full h-0.5 bg-gradient-to-r from-border to-transparent z-0" />
                  )}
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                      <span className="text-sm font-bold gradient-text">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Credit vs Debit */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="warning" className="mb-4">Two Modes</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for your strategy
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Credit Mode */}
              <Card className="border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Badge variant="success">Credit Mode</Badge>
                </div>
                <CardContent className="p-8 pt-12">
                  <h3 className="text-xl font-bold mb-3">Access capital without selling</h3>
                  <ul className="space-y-3">
                    {[
                      "Use your crypto as collateral",
                      "Get up to 2% cashback on purchases",
                      "Keep earning interest on collateral",
                      "No credit checks or fixed repayments",
                      "Flexible credit line from 1.9% APR",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="gradient" className="mt-6 w-full" asChild>
                    <Link href="/dashboard">Try Credit Mode</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Debit Mode */}
              <Card className="border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Badge variant="info">Debit Mode</Badge>
                </div>
                <CardContent className="p-8 pt-12">
                  <h3 className="text-xl font-bold mb-3">Spend your digital assets</h3>
                  <ul className="space-y-3">
                    {[
                      "Spend stablecoins, SOL, and more",
                      "Auto-convert at point of sale",
                      "Choose which token to spend first",
                      "Earn daily compound interest",
                      "No minimum balance requirements",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="mt-6 w-full" asChild>
                    <Link href="/card">Activate Card</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-card/30">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start spending smarter with{" "}
                <span className="gradient-text">CardBridger</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Connect your Solana wallet and activate your card in under 2 minutes.
              </p>
              <Button variant="gradient" size="xl" asChild>
                <Link href="/dashboard">
                  <Wallet className="w-5 h-5" />
                  Launch App
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
