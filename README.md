# ARKK - Best Management Team 2040

A comprehensive live event management system for the ARKK Best Management Team competition set in the year 2040.

## Overview

This application is a real-time interactive platform where an Admin controls the entire event while approximately 20 participating teams interact through their own secure dashboards. The system features six complete rounds with bidding, auctions, resource management, video uploads, negotiations, and final board meetings.

## Features

### Admin Control Panel
- Complete event control with real-time updates
- Team management with credential generation
- Question bidding system (Round 1A)
- Zone auction system (Round 1B)
- Wave-based problem system (Round 2)
- Video upload deadline management (Round 3)
- Press conference scoring (Round 4)
- Resource negotiation system (Round 5)
- Final board meeting and audit (Round 6)
- Comprehensive audit logging
- Live leaderboard with visibility controls

### Participant Dashboard
- Secure team-specific login
- Real-time ARC balance tracking (200,000 starting + 50,000 frozen)
- Zone information display
- Round-specific interfaces
- Transaction history
- Score tracking across all rounds
- Resource inventory management
- Deal creation and confirmation

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **Authentication**: JWT with bcryptjs
- **UI Components**: Custom components with Tailwind

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Teams (ARKK01-ARKK20):**
- Username: `ARKK01` through `ARKK20`
- Password: `team123`

## Application Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/          # Admin control center
│   │   ├── round1a/             # Question bidding control
│   │   ├── round1b/             # Zone auction control
│   │   ├── round2/              # Waves and proposals
│   │   ├── round3/              # Video uploads
│   │   ├── round4/              # Press conference scoring
│   │   ├── round5/              # Negotiations
│   │   ├── round6/              # Final board meeting
│   │   ├── leaderboard/         # Full leaderboard
│   │   └── audit/               # Audit log viewer
│   ├── participant/
│   │   ├── dashboard/          # Team dashboard
│   │   ├── round1a/             # Question bidding
│   │   ├── round1b/             # Zone auction
│   │   ├── round2/              # Waves and proposals
│   │   ├── round3/              # Video upload
│   │   ├── round4/              # Press conference info
│   │   ├── round5/              # Negotiations
│   │   └── round6/              # Final board meeting
│   ├── login/                  # Login page
│   └── page.tsx                # Home (redirects to login)
├── components/
│   └── DataInitializer.tsx     # Demo data initialization
├── lib/
│   ├── auth.ts                # Authentication logic
│   ├── demo-data.ts           # Demo data generator
│   ├── store.ts               # Zustand state management
│   └── utils.ts               # Utility functions
└── types/
    └── index.ts               # TypeScript type definitions
```

## Event Flow

### Round 1A - Question Bidding
1. Admin starts round
2. Admin displays question
3. Teams bid (externally)
4. Admin awards question to winning team
5. Winning team submits answer
6. Admin marks correct/wrong
7. Points awarded/deducted

### Round 1B - Zone Auction
1. Admin starts zone study mode
2. Teams view available zones
3. Admin starts auction for zone
4. Teams bid (externally)
5. Admin awards zone to winning team
6. Zone assigned, ARC deducted
7. Process repeats for all zones

### Round 2 - Allotment & Proposal
1. Admin starts round (frozen 50,000 ARC released)
2. Admin starts waves with problems
3. Teams submit wave responses
4. Store opens for resource purchases
5. Teams submit final proposals

### Round 3 - Promotion Video
1. Admin sets upload deadline
2. Teams upload promotional videos
3. Admin tracks submissions
4. Late submissions marked

### Round 4 - Press Conference
1. Admin starts round
2. Teams present to board/press
3. Admin/judges score presentations
4. Scores recorded

### Round 5 - Negotiation
1. Admin starts round
2. Teams create deals with other teams
3. Both parties confirm deals
4. Admin approves/rejects deals
5. Resources transferred

### Round 6 - Board Meeting
1. Admin starts final round
2. Teams present complete journey
3. Jury scores final performance
4. Final leaderboard determined
5. Event completed

## Data Persistence

The application uses Zustand with localStorage persistence. All data including:
- Teams and credentials
- Wallets and transactions
- Questions and bids
- Zones and ownership
- Scores and proposals
- Videos and deals
- Audit logs

are persisted in the browser's localStorage.

## Demo Data

The application initializes with:
- 20 teams (ARKK01-ARKK20)
- 20 zones with unique characteristics
- 30 questions (easy/medium/hard)
- 3 Round 2 waves
- 8 store items
- 8 resource types

## Security Notes

This is a demonstration/prototype application. For production use:
- Implement proper backend API with database
- Use secure session management
- Add rate limiting
- Implement proper file upload handling
- Add CSRF protection
- Use environment variables for secrets
- Implement proper real-time backend (WebSockets/Supabase Realtime)

## Browser Compatibility

Works on:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern browsers with ES6+ support

## License

This project is for the ARKK Best Management Team 2040 competition.
