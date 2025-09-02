# Workboard

Production-ready MERN monorepo for project management with real-time collaboration.

## Quick Start

1. ```bash
   cd workboard
   bun install
   ```

2. ```bash
   cp packages/server/.env.example packages/server/.env
   # Edit .env with your MongoDB URI
   ```

3. Start MongoDB locally

4. ```bash
   bun run seed  # Optional demo data
   ```

5. ```bash
   bun run dev:server  # Terminal 1
   bun run dev:web     # Terminal 2
   ```

## Demo Accounts
- Admin: admin@workboard.dev / Admin@123
- Manager: manager@workboard.dev / Manager@123
- Employee: employee@workboard.dev / Employee@123

Visit http://localhost:5173