import { NextResponse } from 'next/server';
import { officialZones } from '@/lib/zones';
import { Round1AState, Round1BState, EventState, Wallet } from '@/types';

function getInitialWallets(): Wallet[] {
  const list: Wallet[] = [];
  for (let i = 1; i <= 25; i++) {
    list.push({
      team_id: `team_${String(i).padStart(2, '0')}`,
      usable_balance: 200000,
      frozen_balance: 50000,
    });
  }
  return list;
}

const initialRound1AState: Round1AState = {
  active: false,
  status: 'ROUND_NOT_STARTED',
  current_question_index: -1,
  current_question_id: undefined,
  current_question_text: undefined,
  current_question_category: undefined,
  current_question_difficulty: undefined,
  current_question_points: undefined,
  bidding_open: false,
  answering_team_id: undefined,
  submitted_answer: undefined,
  answer_timer_running: false,
  answer_timer_remaining: 0,
};

const initialEventState: EventState = {
  current_round: 0,
  current_activity: 'Event not started',
  timer_running: false,
  timer_duration: 0,
  timer_remaining: 0,
  leaderboard_visible: false,
  event_status: 'not_started',
};

const initialRound1BState: Round1BState = {
  active: false,
  frozen_unlocked: false,
  zone_study_mode: false,
  current_auction_zone_id: undefined,
  auction_open: false,
  auction_status: 'idle',
  current_bid_amount: undefined,
  current_bidder_id: undefined,
  current_bidder_name: undefined,
  current_bidder_number: undefined,
  next_bid_amount: undefined,
  bids: [],
};

declare global {
  // eslint-disable-next-line no-var
  var __arkk_reset_epoch: number | undefined;
}

export async function POST() {
  const newEpoch = Date.now();
  globalThis.__arkk_reset_epoch = newEpoch;

  // Reset Round 1A server singleton
  if (globalThis.__arkk_central_state) {
    globalThis.__arkk_central_state = {
      version: (globalThis.__arkk_central_state.version || 0) + 1,
      round1AState: { ...initialRound1AState },
      eventState: { ...initialEventState },
      scores: [],
    };
  }

  const initialWallets = getInitialWallets();
  globalThis.__arkk_shared_wallets = initialWallets;
  globalThis.__arkk_shared_scores = [];

  // Reset Round 1B server singleton
  globalThis.__arkk_round1b_state = {
    version: (globalThis.__arkk_round1b_state?.version || 0) + 1,
    round1BState: { ...initialRound1BState },
    zones: officialZones.map((z) => ({ ...z })),
    wallets: initialWallets,
    eventState: { ...initialEventState },
  };

  return NextResponse.json({
    success: true,
    reset_epoch: newEpoch,
    round1AState: initialRound1AState,
    round1BState: initialRound1BState,
    eventState: initialEventState,
    wallets: initialWallets,
    zones: officialZones.map((z) => ({ ...z })),
    scores: [],
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    reset_epoch: globalThis.__arkk_reset_epoch || 0,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
