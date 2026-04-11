# Lamyt Finance — Crypto Fiat Card MVP

![Lamyt Logo](https://via.placeholder.com/150x50?text=Lamyt+Finance) <!-- Replace with actual logo -->

A revolutionary crypto fiat card that lets you spend your crypto without selling it. Built on Solana with Anchor smart contracts, Lamyt enables credit mode spending, 2% cashback rewards, and daily interest on collateral.

## 🚀 Features

### Core Functionality

- **Credit & Debit Mode**: Switch between direct crypto spending or using crypto as collateral for a credit line
- **2% Cashback Rewards**: Earn up to 2% cashback in crypto on every purchase in Credit Mode
- **Daily Interest**: Unspent collateral earns interest 24/7
- **Non-Custodial Security**: Your keys, your crypto — backed by Anchor smart contracts
- **Global Acceptance**: Accepted at 100M+ merchants worldwide with Apple Pay & Google Pay support
- **Instant Swaps**: Best-rate token swaps powered by Jupiter DEX aggregator

### Technical Highlights

- **Solana Integration**: High-speed, low-cost transactions
- **Real-time Liquidation Protection**: Automated risk management
- **Multi-token Support**: Deposit SOL and other supported tokens as collateral
- **POS Simulator**: Test card transactions in a simulated environment

## 🛠 Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Backend

- **Rust** - High-performance systems programming
- **Actix Web** (assumed) - Web framework for API services

### Blockchain

- **Solana** - High-performance blockchain
- **Anchor Framework** - Solana smart contract development
- **Jupiter** - DEX aggregator for token swaps

### Infrastructure

- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **Terraform** - Infrastructure as Code

## 📋 Prerequisites

- Node.js 18+
- Rust 1.70+
- Solana CLI tools
- Anchor CLI
- Docker & Docker Compose

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/lamyt-finance.git
cd lamyt-finance
```

### 2. Setup Web Application

```bash
cd apps/web
npm install
npm run dev
```

The web app will be available at `http://localhost:3000`

### 3. Setup Backend

```bash
cd backend
cargo build
cargo run
```

### 4. Setup Solana Program

```bash
cd programs/lending_vault
anchor build
anchor deploy
```

### 5. Environment Configuration

Create `.env.local` in `apps/web` with:

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_JUPITER_API_URL=https://quote-api.jup.ag/v4
```

## 📖 Usage

### For Users

1. Connect your Solana wallet
2. Deposit collateral (SOL or supported tokens)
3. Activate your virtual Lamyt Card
4. Start spending and earning rewards

### For Developers

- **Development**: `npm run dev` in web app
- **Building**: `npm run build`
- **Testing**: Run tests in respective directories
- **POS Simulation**: Visit `/pos-simulator` to test card transactions

## 🏗 Architecture

```
├── apps
│   └── web
│       ├── AGENTS.md
│       ├── bun.lock
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── next-env.d.ts
│       ├── package.json
│       ├── package-lock.json
│       ├── postcss.config.mjs
│       ├── src
│       │   ├── app
│       │   │   ├── card
│       │   │   ├── dashboard
│       │   │   ├── favicon.ico
│       │   │   ├── globals.css
│       │   │   ├── lamyt.tsx
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── pos-simulator
│       │   │   └── swap
│       │   ├── components
│       │   │   ├── CardBalance.tsx
│       │   │   ├── HealthFactorMeter.tsx
│       │   │   ├── Lamyt
│       │   │   ├── ui
│       │   │   └── WalletConnect.tsx
│       │   ├── hooks
│       │   │   ├── useCardBalance.ts
│       │   │   └── useHealthFactor.ts
│       │   └── lib
│       │       ├── anchor-client.ts
│       │       ├── api-client.ts
│       │       ├── jupiter.ts
│       │       ├── solana.ts
│       │       └── utils.ts
│       └── tsconfig.json
├── backend
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── src
│   │   ├── handlers
│   │   ├── main.rs
│   │   ├── modules
│   │   ├── solana
│   │   ├── state
│   │   └── utils
│   └── target
│       ├── CACHEDIR.TAG
│       ├── debug
│       │   ├── build
│       │   ├── deps
│       │   │   ├── backend-15d90d440c77bbf3.d
│       │   │   ├── backend-98cbaac38c2d0db0.d
│       │   │   ├── libbackend-15d90d440c77bbf3.rmeta
│       │   │   └── libbackend-98cbaac38c2d0db0.rmeta
│       │   ├── examples
│       │   └── incremental
│       │       ├── backend-05eekkbpzwlfx
│       │       └── backend-0gci9cug64eun
│       └── flycheck0
│           ├── stderr
│           └── stdout
├── docs
│   ├── adr
│   ├── compliance
│   ├── research
│   └── whitepaper
├── infrastructure
│   ├── docker
│   ├── kubernetes
│   └── terraform
├── packages
│   ├── core
│   ├── sdk
│   └── ui
├── programs
│   └── lending_vault
│       ├── Anchor.toml
│       ├── Cargo.toml
│       └── src
│           ├── Anchor.toml
│           ├── Cargo.toml
│           ├── error.rs
│           ├── instructions
│           │   ├── borrow.rs
│           │   ├── deposit.rs
│           │   ├── liquidate.rs
│           │   ├── repay.rs
│           │   └── withdraw.rs
│           ├── lib.rs
│           └── state
│               ├── user_position.rs
│               └── vault.rs
├── README.md
├── scripts
└── tests
    └── e2e
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- Website: [lamyt.finance](https://lamyt.finance)
- Twitter: [@LamytFinance](https://twitter.com/LamytFinance)
- Discord: [Join our community](https://discord.gg/lamyt)

## ⚠️ Disclaimer

This is an MVP (Minimum Viable Product) and is for demonstration purposes. Not intended for production use without further development and security audits.

---

_Built with ❤️ on Solana_
