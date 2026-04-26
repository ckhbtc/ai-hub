# Injective AI Hub

A chat-first AI trading terminal for [Injective](https://injective.com) perpetuals. Type a question, pull market data, open and close positions, bridge cross-chain — all from a prompt.

Live: **[hub.inj.so](https://hub.inj.so)**

> Independent, unofficial. Built on Injective infra, not affiliated with Injective Labs.

---

## What it does

- **Ask anything about markets** — prices, orderbook depth, funding rates, your balances and open positions
- **Open and close perp positions** — natural language → MetaMask signature → on-chain trade
- **YOLO mode** — grant a session-scoped AuthZ permission so the agent can sign trades for you without per-action prompts
- **Bridge USDC → USDT** from Arbitrum to Injective via deBridge DLN
- **Pay-per-message** — deposit USDT once, ~$0.01 per chat message via [x402](https://github.com/coinbase/x402)

The agent is Claude (via the Anthropic API). Server-side tools fetch live chain data and feed it back into the conversation; browser-side tools surface as confirmation cards before any wallet signature.

---

## Architecture

```
ai-hub/
├── backend/    Hono server — Anthropic agent loop, x402 payment gate, Injective queries
└── frontend/   React + Vite — chat UI, MetaMask integration, trade execution
```

**Backend** (`backend/src/`)
- `index.ts` — HTTP server, routes
- `chat.ts` — Anthropic SDK orchestration; system prompt; agentic tool loop
- `tools.ts` — server-side tools (markets, balances, oracle prices) + browser-tool definitions
- `x402-middleware.ts` — payment gate; rejects `/api/chat` with HTTP 402 when credits run out
- `credits.ts` — in-memory credit ledger (deposit verification via on-chain ERC-20 event logs)
- `injective.ts` — Injective SDK helpers
- `faucet.ts` — small INJ gas grant for fresh wallets
- `x402.ts` — wrapped-token addresses

**Frontend** (`frontend/src/`)
- `App.tsx` — single-page UI: topbar, sidebar, transcript, composer
- `index.css` — design system (light + dark themes via `data-theme`)
- `wallet.ts` — MetaMask connect, address conversion (bech32 ↔ EVM)
- `tx.ts` — Injective perp trade execution
- `bridge.ts` — deBridge DLN client
- `autosign.ts` — AuthZ session setup (YOLO mode)
- `x402.ts` — client-side x402 payment helpers
- `api.ts` — typed fetch client to the backend

---

## Quickstart

### Prerequisites

- Node 20+
- An Anthropic API key
- (Optional) MetaMask + an Injective wallet for live trading

### 1. Clone + install

```bash
git clone https://github.com/<your-fork>/ai-hub.git
cd ai-hub
( cd backend  && npm install )
( cd frontend && npm install )
```

### 2. Configure

```bash
cd backend
cp .env.example .env
# edit .env — at minimum set ANTHROPIC_API_KEY
```

### 3. Run

In two terminals:

```bash
# terminal A — backend (hono on :3001)
cd backend && npm run dev

# terminal B — frontend (vite on :5173, proxies /api → :3001)
cd frontend && npm run dev
```

Open http://localhost:5173.

### Production build

```bash
( cd frontend && npm run build )   # → frontend/dist
( cd backend  && npm run build )   # → backend/dist
cd backend && npm start            # serves API + static frontend on $PORT
```

The backend serves `frontend/dist` as static files, so a single Node process runs the whole app.

---

## Configuration

All env vars live in `backend/.env`. Copy from `backend/.env.example`.

| Var | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Claude API key (`sk-ant-...`) |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-haiku-4-5-20251001` |
| `PORT` | no | Server port, defaults to `3001` |
| `WRAPPED_USDT_ADDRESS` | for x402 | x402 wrapped USDT contract on Injective EVM |
| `WRAPPED_USDC_ADDRESS` | for x402 | x402 wrapped USDC contract |
| `FAUCET_PRIVATE_KEY` | for faucet | Wallet that funds fresh users with INJ gas |
| `FACILITATOR_PRIVATE_KEY` | for paid mode | Wallet that receives USDT deposits and gates `/api/chat`. **When unset, the chat API is free (dev mode).** |

---

## Pay-per-message (x402)

When `FACILITATOR_PRIVATE_KEY` is set, every `/api/chat` request goes through `x402-middleware.ts`:

1. User deposits USDT (ERC-20 transfer on Injective EVM, chain `1776`) to the facilitator address.
2. Frontend submits the transfer tx hash to `POST /api/deposit`.
3. Backend verifies the on-chain Transfer event and credits the user's balance in `credits.json`.
4. Each chat message deducts a fixed cost (default `$0.01`); if the balance is too low, the API returns HTTP 402.

`credits.json` is a plain-JSON ledger keyed by EVM address — gitignored, never commit it.

For self-hosting without payments, leave `FACILITATOR_PRIVATE_KEY` unset and the chat API is open.

---

## Deployment

The deployed instance runs on AWS Lightsail behind nginx + Let's Encrypt. PM2 manages the Node process. Frontend is built and served by the same backend process. Any platform that runs Node 20+ should work.

---

## Contributing

PRs welcome. Focus areas where help is appreciated:

- Streaming chat responses (currently non-streaming)
- More server-side tools (LP positions, vault balances)
- Mobile polish (works but untested)
- Test coverage on the trade execution path (`tx.ts`)

Code style: ESLint + Prettier defaults already configured. Single quotes, 2-space indent.

---

## License

MIT — see [LICENSE](LICENSE).
