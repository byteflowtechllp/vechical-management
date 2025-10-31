# Vehicle Management PWA

A Progressive Web App built with React, TypeScript, Vite, and Stylus for managing vehicles, jobs, and expenses.

## Features

- 🔐 Passcode authentication
- 🚗 Vehicle management (CRUD operations)
- 💼 Job management with billing cycles and credit tracking
- 💰 Expense tracking
- 📱 Fully responsive mobile design
- ⚡ PWA support with offline capabilities

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Default Passcode

The default passcode to access the app is: `1234`

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Stylus** - CSS preprocessor
- **Vite PWA Plugin** - Progressive Web App features

## Project Structure

```
src/
├── components/          # React components
│   ├── PasscodeScreen.tsx
│   ├── HomeScreen.tsx
│   ├── VehicleDetailScreen.tsx
│   ├── VehicleModal.tsx
│   ├── JobModal.tsx
│   ├── ExpenseModal.tsx
│   └── CreditModal.tsx
├── types/              # TypeScript type definitions
│   └── index.ts
├── styles/            # Stylus variables
│   └── variables.styl
├── App.tsx            # Main app component
└── main.tsx           # Entry point
```

## Data Storage

All data is stored in the browser's localStorage. Each vehicle's jobs and expenses are stored separately using keys like `vehicle_{vehicleId}_jobs` and `vehicle_{vehicleId}_expenses`.

## License

MIT

