import { NextResponse } from 'next/server';
import { Round1AState, EventState, Wallet, Score, QuestionBid } from '@/types';
import { standardQuestions } from '@/lib/questions';

interface CentralState {
  version: number;
  round1AState: Round1AState;
  eventState: EventState;
  scores?: Score[];
}

// Global declaration to ensure singleton across hot-reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __arkk_central_state: CentralState | undefined;
  // eslint-disable-next-line no-var
  var __arkk_shared_wallets: Wallet[] | undefined;
  // eslint-disable-next-line no-var
  var __arkk_shared_scores: Score[] | undefined;
}

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

export function getSharedWallets(): Wallet[] {
  if (!globalThis.__arkk_shared_wallets) {
    if (globalThis.__arkk_round1b_state?.wallets) {
      globalThis.__arkk_shared_wallets = globalThis.__arkk_round1b_state.wallets;
    } else {
      globalThis.__arkk_shared_wallets = getInitialWallets();
    }
  }
  return globalThis.__arkk_shared_wallets;
}

function getDifficultyConfig(difficulty?: 'easy' | 'medium' | 'hard') {
  switch (difficulty) {
    case 'medium':
      return { base_bid: 5000, bid_increment: 3000 };
    case 'hard':
      return { base_bid: 10000, bid_increment: 5000 };
    case 'easy':
    default:
      return { base_bid: 3000, bid_increment: 2000 };
  }
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
  question_start_time: undefined,
  prep_end_time: undefined,
  prep_timer_remaining: 0,
  bidding_end_time: undefined,
  bidding_timer_remaining: 0,
  bidding_open: false,
  current_bid_amount: undefined,
  current_bidder_id: undefined,
  current_bidder_name: undefined,
  current_bidder_number: undefined,
  next_bid_amount: undefined,
  base_bid: undefined,
  bid_increment: undefined,
  bids: [],
  answering_team_id: undefined,
  submitted_answer: undefined,
  answer_timer_running: false,
  answer_timer_remaining: 0,
  answer_timer_end_time: undefined,
  award_amount: undefined,
  evaluation_result: undefined,
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

function getCentralState(): CentralState {
  if (!globalThis.__arkk_central_state) {
    globalThis.__arkk_central_state = {
      version: 1,
      round1AState: { ...initialRound1AState },
      eventState: { ...initialEventState },
      scores: [],
    };
  }
  return globalThis.__arkk_central_state;
}

function updateRound1ATimers(state: CentralState) {
  const r1a = state.round1AState;
  if (!r1a.active) return;

  const now = Date.now();

  const isBiddingPhase =
    r1a.status === 'QUESTION_DISPLAYED' ||
    r1a.status === 'PREPARATION_30_SEC' ||
    r1a.status === 'BIDDING_OPEN_60_SEC' ||
    r1a.status === 'BIDDING_CLOSED';

  if (isBiddingPhase && r1a.prep_end_time && r1a.bidding_end_time) {
    if (now < r1a.prep_end_time) {
      r1a.status = 'PREPARATION_30_SEC';
      r1a.prep_timer_remaining = Math.max(0, Math.ceil((r1a.prep_end_time - now) / 1000));
      r1a.bidding_timer_remaining = 60;
      r1a.bidding_open = false;
    } else if (now < r1a.bidding_end_time) {
      r1a.status = 'BIDDING_OPEN_60_SEC';
      r1a.prep_timer_remaining = 0;
      r1a.bidding_timer_remaining = Math.max(0, Math.ceil((r1a.bidding_end_time - now) / 1000));
      r1a.bidding_open = true;
    } else {
      r1a.status = 'BIDDING_CLOSED';
      r1a.prep_timer_remaining = 0;
      r1a.bidding_timer_remaining = 0;
      r1a.bidding_open = false;
    }
  }

  if (r1a.answer_timer_running && r1a.answer_timer_end_time) {
    const rem = Math.max(0, Math.ceil((r1a.answer_timer_end_time - now) / 1000));
    if (rem <= 0) {
      r1a.answer_timer_running = false;
      r1a.answer_timer_remaining = 0;
      if (r1a.status === 'ANSWERING_ACTIVE') {
        r1a.status = 'TIMES_UP';
        r1a.evaluation_result = 'times_up';
      }
    } else {
      r1a.answer_timer_remaining = rem;
    }
  }
}

export async function GET() {
  const state = getCentralState();
  updateRound1ATimers(state);

  const wallets = getSharedWallets();
  const scores = globalThis.__arkk_shared_scores && globalThis.__arkk_shared_scores.length > 0
    ? globalThis.__arkk_shared_scores
    : (state.scores || []);

  return NextResponse.json({
    version: state.version,
    reset_epoch: globalThis.__arkk_reset_epoch || 0,
    round1AState: state.round1AState,
    eventState: state.eventState,
    scores: scores,
    wallets: wallets,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = getCentralState();
    updateRound1ATimers(state);
    const { action, payload } = body;

    switch (action) {
      case 'START_ROUND': {
        state.round1AState = {
          ...state.round1AState,
          active: true,
          status: 'ROUND_STARTED_WAITING',
          current_question_index: -1,
          current_question_id: undefined,
          current_question_text: undefined,
          current_question_category: undefined,
          current_question_difficulty: undefined,
          current_question_points: undefined,
          question_start_time: undefined,
          prep_end_time: undefined,
          prep_timer_remaining: 0,
          bidding_end_time: undefined,
          bidding_timer_remaining: 0,
          bidding_open: false,
          current_bid_amount: undefined,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: undefined,
          base_bid: undefined,
          bid_increment: undefined,
          bids: [],
          answering_team_id: undefined,
          submitted_answer: undefined,
          answer_timer_running: false,
          answer_timer_remaining: 0,
          answer_timer_end_time: undefined,
          evaluation_result: undefined,
          award_amount: undefined,
        };
        state.eventState = {
          ...state.eventState,
          current_round: 1,
          current_activity: 'Round 1A - Waiting for Question',
          event_status: 'in_progress',
        };
        state.version += 1;
        break;
      }

      case 'DISPLAY_QUESTION': {
        const requestedId = payload?.questionId;
        let index = -1;

        if (requestedId) {
          index = standardQuestions.findIndex(
            (q) => q.id.toLowerCase() === requestedId.toLowerCase()
          );
        }

        if (index === -1) {
          const cur = state.round1AState.current_question_index;
          index = (cur !== undefined && cur >= 0) ? cur : 0;
        }

        const q = standardQuestions[index] || standardQuestions[0];
        const { base_bid, bid_increment } = getDifficultyConfig(q.difficulty);
        const startTime = Date.now();
        const prepEndTime = startTime + 30 * 1000;
        const biddingEndTime = prepEndTime + 60 * 1000;

        state.round1AState = {
          ...state.round1AState,
          active: true,
          status: 'PREPARATION_30_SEC',
          current_question_index: index,
          current_question_id: q.id,
          current_question_text: q.question_text,
          current_question_category: q.category,
          current_question_difficulty: q.difficulty,
          current_question_points: q.points,
          question_start_time: startTime,
          prep_end_time: prepEndTime,
          prep_timer_remaining: 30,
          bidding_end_time: biddingEndTime,
          bidding_timer_remaining: 60,
          bidding_open: false,
          base_bid,
          bid_increment,
          current_bid_amount: base_bid,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: base_bid,
          bids: [],
          answering_team_id: undefined,
          submitted_answer: undefined,
          answer_timer_running: false,
          answer_timer_remaining: 0,
          answer_timer_end_time: undefined,
          evaluation_result: undefined,
          award_amount: undefined,
        };

        state.eventState = {
          ...state.eventState,
          current_round: 1,
          current_activity: `Question ${q.id} (${q.difficulty.toUpperCase()}) - Preparation (30s)`,
          event_status: 'in_progress',
        };
        state.version += 1;
        break;
      }

      case 'PLACE_BID': {
        const data = payload || body;
        const teamId = data?.teamId || data?.team_id;
        const teamName = data?.teamName || data?.team_name;
        const teamNumber = data?.teamNumber || data?.team_number;
        const amount = Number(data?.amount || data?.bid_amount);
        const now = Date.now();

        if (!state.round1AState.active || !state.round1AState.current_question_id) {
          return NextResponse.json({ error: 'No active question for bidding' }, { status: 400 });
        }

        if (state.round1AState.status === 'PREPARATION_30_SEC' || (state.round1AState.prep_end_time && now < state.round1AState.prep_end_time)) {
          return NextResponse.json({ error: 'Question is currently in preparation phase. Bidding is not open yet.' }, { status: 400 });
        }

        if (state.round1AState.status === 'BIDDING_CLOSED' || (state.round1AState.bidding_end_time && now >= state.round1AState.bidding_end_time)) {
          return NextResponse.json({ error: 'Bidding is closed for this question' }, { status: 400 });
        }

        if (!state.round1AState.bidding_open) {
          return NextResponse.json({ error: 'Bidding is not currently open' }, { status: 400 });
        }

        const wallets = getSharedWallets();
        const wallet = wallets.find((w) => w.team_id === teamId);
        if (!wallet || wallet.usable_balance < amount) {
          return NextResponse.json({ error: 'INSUFFICIENT ARK BALANCE' }, { status: 400 });
        }

        const expectedBid = state.round1AState.next_bid_amount || state.round1AState.base_bid || 3000;
        if (amount !== expectedBid) {
          return NextResponse.json({
            error: `Your bid of ${amount.toLocaleString()} ARK is outdated or invalid. Next valid bid is ${expectedBid.toLocaleString()} ARK.`
          }, { status: 409 });
        }

        if (state.round1AState.current_bidder_id === teamId) {
          return NextResponse.json({ error: 'Your team is already the lead bidder' }, { status: 400 });
        }

        const newBid: QuestionBid = {
          id: `qbid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          question_id: state.round1AState.current_question_id,
          team_id: teamId,
          team_name: teamName || teamId,
          team_number: teamNumber,
          bid_amount: amount,
          winner: false,
          timestamp: new Date().toISOString(),
          server_timestamp: new Date().toISOString(),
        };

        const existingBids = state.round1AState.bids || [];
        state.round1AState.bids = [newBid, ...existingBids];
        state.round1AState.current_bid_amount = amount;
        state.round1AState.current_bidder_id = teamId;
        state.round1AState.current_bidder_name = teamName;
        state.round1AState.current_bidder_number = teamNumber;
        state.round1AState.next_bid_amount = amount + (state.round1AState.bid_increment || 2000);

        state.eventState = {
          ...state.eventState,
          current_activity: `Lead Bid: ${amount.toLocaleString()} ARK by ${teamName || teamId}`,
        };
        state.version += 1;
        break;
      }

      case 'NEXT_QUESTION': {
        const requestedId = payload?.questionId;
        let nextIndex = -1;

        if (requestedId) {
          nextIndex = standardQuestions.findIndex(
            (q) => q.id.toLowerCase() === requestedId.toLowerCase()
          );
        }

        if (nextIndex === -1) {
          const currentIndex = state.round1AState.current_question_index ?? -1;
          nextIndex = currentIndex + 1;
        }

        if (nextIndex >= standardQuestions.length) {
          state.round1AState = {
            ...state.round1AState,
            status: 'ROUND_STARTED_WAITING',
            current_question_index: -1,
            current_question_id: undefined,
            current_question_text: undefined,
            current_question_category: undefined,
            current_question_difficulty: undefined,
            current_question_points: undefined,
            question_start_time: undefined,
            prep_end_time: undefined,
            prep_timer_remaining: 0,
            bidding_end_time: undefined,
            bidding_timer_remaining: 0,
            bidding_open: false,
            current_bid_amount: undefined,
            current_bidder_id: undefined,
            current_bidder_name: undefined,
            current_bidder_number: undefined,
            next_bid_amount: undefined,
            base_bid: undefined,
            bid_increment: undefined,
            bids: [],
            answering_team_id: undefined,
            submitted_answer: undefined,
            answer_timer_running: false,
            answer_timer_remaining: 0,
            answer_timer_end_time: undefined,
            evaluation_result: undefined,
            award_amount: undefined,
          };
          state.eventState = {
            ...state.eventState,
            current_activity: 'All questions completed - Ready to End Round 1A',
          };
        } else {
          const nextQ = standardQuestions[nextIndex];
          const { base_bid, bid_increment } = getDifficultyConfig(nextQ.difficulty);
          const startTime = Date.now();
          const prepEndTime = startTime + 30 * 1000;
          const biddingEndTime = prepEndTime + 60 * 1000;

          state.round1AState = {
            ...state.round1AState,
            active: true,
            status: 'PREPARATION_30_SEC',
            current_question_index: nextIndex,
            current_question_id: nextQ.id,
            current_question_text: nextQ.question_text,
            current_question_category: nextQ.category,
            current_question_difficulty: nextQ.difficulty,
            current_question_points: nextQ.points,
            question_start_time: startTime,
            prep_end_time: prepEndTime,
            prep_timer_remaining: 30,
            bidding_end_time: biddingEndTime,
            bidding_timer_remaining: 60,
            bidding_open: false,
            base_bid,
            bid_increment,
            current_bid_amount: base_bid,
            current_bidder_id: undefined,
            current_bidder_name: undefined,
            current_bidder_number: undefined,
            next_bid_amount: base_bid,
            bids: [],
            answering_team_id: undefined,
            submitted_answer: undefined,
            answer_timer_running: false,
            answer_timer_remaining: 0,
            answer_timer_end_time: undefined,
            evaluation_result: undefined,
            award_amount: undefined,
          };
          state.eventState = {
            ...state.eventState,
            current_round: 1,
            current_activity: `Question ${nextQ.id} (${nextQ.difficulty.toUpperCase()}) - Preparation (30s)`,
          };
        }
        state.version += 1;
        break;
      }

      case 'END_ROUND': {
        state.round1AState = {
          ...state.round1AState,
          active: false,
          status: 'ROUND_ENDED',
          current_question_index: -1,
          current_question_id: undefined,
          current_question_text: undefined,
          current_question_category: undefined,
          current_question_difficulty: undefined,
          current_question_points: undefined,
          question_start_time: undefined,
          prep_end_time: undefined,
          prep_timer_remaining: 0,
          bidding_end_time: undefined,
          bidding_timer_remaining: 0,
          bidding_open: false,
          current_bid_amount: undefined,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: undefined,
          base_bid: undefined,
          bid_increment: undefined,
          bids: [],
          answering_team_id: undefined,
          submitted_answer: undefined,
          answer_timer_running: false,
          answer_timer_remaining: 0,
          answer_timer_end_time: undefined,
          evaluation_result: undefined,
          award_amount: undefined,
        };
        state.eventState = {
          ...state.eventState,
          current_round: 1,
          current_activity: 'Round 1A Completed',
        };
        state.version += 1;
        break;
      }

      case 'AWARD_QUESTION': {
        const duration = payload?.duration || 30;
        const endTime = Date.now() + duration * 1000;
        const amount = Number(payload?.amount) || 0;
        const teamId = payload?.teamId;

        if (teamId && amount > 0) {
          const wallets = getSharedWallets();
          const target = wallets.find((w) => w.team_id === teamId);
          if (target) {
            target.usable_balance = Math.max(0, target.usable_balance - amount);
          }
        }

        if (state.round1AState.bids) {
          state.round1AState.bids = state.round1AState.bids.map((b) => ({
            ...b,
            winner: b.team_id === teamId && b.bid_amount === amount,
          }));
        }

        state.round1AState = {
          ...state.round1AState,
          active: true,
          status: 'ANSWERING_ACTIVE',
          bidding_open: false,
          answering_team_id: teamId,
          submitted_answer: undefined,
          answer_timer_running: true,
          answer_timer_remaining: duration,
          answer_timer_end_time: endTime,
          award_amount: amount,
          evaluation_result: undefined,
        };
        state.eventState = {
          ...state.eventState,
          current_activity: `Question awarded to Team - Answering Active`,
        };
        state.version += 1;
        break;
      }

      case 'SUBMIT_ANSWER': {
        state.round1AState = {
          ...state.round1AState,
          status: 'WAITING_FOR_ADMIN_DECISION',
          submitted_answer: payload?.answer,
          answer_timer_running: false,
          answer_timer_remaining: payload?.timerRemaining ?? state.round1AState.answer_timer_remaining,
          answer_timer_end_time: undefined,
          evaluation_result: undefined,
        };
        state.eventState = {
          ...state.eventState,
          current_activity: `Answer submitted - Waiting for Admin decision`,
        };
        state.version += 1;
        break;
      }

      case 'TIME_OUT': {
        state.round1AState = {
          ...state.round1AState,
          status: 'TIMES_UP',
          answer_timer_running: false,
          answer_timer_remaining: 0,
          answer_timer_end_time: undefined,
          evaluation_result: 'times_up',
        };
        state.eventState = {
          ...state.eventState,
          current_activity: `Time's up - Waiting for next question`,
        };
        state.version += 1;
        break;
      }

      case 'EVALUATE_ANSWER': {
        const isCorrect = payload?.isCorrect;
        const newStatus = isCorrect ? 'ANSWER_CORRECT' : 'ANSWER_WRONG';
        state.round1AState = {
          ...state.round1AState,
          status: newStatus,
          answer_timer_running: false,
          answer_timer_remaining: 0,
          answer_timer_end_time: undefined,
          evaluation_result: isCorrect ? 'correct' : 'wrong',
        };
        if (payload?.score) {
          if (!state.scores) state.scores = [];
          state.scores.push(payload.score);
          if (!globalThis.__arkk_shared_scores) globalThis.__arkk_shared_scores = [];
          if (!globalThis.__arkk_shared_scores.some((s) => s.id === payload.score.id)) {
            globalThis.__arkk_shared_scores.push(payload.score);
          }
        }
        state.eventState = {
          ...state.eventState,
          current_activity: `Admin marked answer as ${isCorrect ? 'CORRECT' : 'WRONG'} - Ready for next question`,
        };
        state.version += 1;
        break;
      }

      case 'RESET': {
        state.round1AState = { ...initialRound1AState };
        state.eventState = { ...initialEventState };
        state.scores = [];
        globalThis.__arkk_shared_scores = [];
        globalThis.__arkk_shared_wallets = getInitialWallets();
        state.version += 1;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      version: state.version,
      round1AState: state.round1AState,
      eventState: state.eventState,
      wallets: getSharedWallets(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Server error' },
      { status: 500 }
    );
  }
}
