import { NextResponse } from 'next/server';
import { Round1BState, Zone, Wallet, EventState, ZoneBid } from '@/types';
import { officialZones } from '@/lib/zones';

interface CentralRound1BState {
  version: number;
  round1BState: Round1BState;
  zones: Zone[];
  wallets: Wallet[];
  eventState: Partial<EventState>;
}

declare global {
  // eslint-disable-next-line no-var
  var __arkk_round1b_state: CentralRound1BState | undefined;
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

function getSharedWallets(): Wallet[] {
  if (!globalThis.__arkk_shared_wallets) {
    globalThis.__arkk_shared_wallets = getInitialWallets();
  }
  return globalThis.__arkk_shared_wallets;
}

function getCentralState(): CentralRound1BState {
  if (!globalThis.__arkk_round1b_state) {
    globalThis.__arkk_round1b_state = {
      version: 1,
      round1BState: {
        active: false,
        frozen_unlocked: false,
        zone_study_mode: true,
        current_auction_zone_id: undefined,
        auction_open: false,
        auction_status: 'idle',
        current_bid_amount: undefined,
        current_bidder_id: undefined,
        current_bidder_name: undefined,
        current_bidder_number: undefined,
        next_bid_amount: undefined,
        bids: [],
      },
      zones: officialZones.map((z) => ({ ...z })),
      wallets: getSharedWallets(),
      eventState: {
        current_round: 1,
        current_activity: 'Round 1B - Zone Auction Standby',
        event_status: 'in_progress',
      },
    };
  } else {
    // Ensure zones metadata matches the official zones specification
    globalThis.__arkk_round1b_state.zones = officialZones.map((oz) => {
      const existing = globalThis.__arkk_round1b_state?.zones?.find((ez) => ez.id === oz.id || ez.zone_number === oz.zone_number);
      if (existing && existing.owner_team_id) {
        return {
          ...oz,
          owner_team_id: existing.owner_team_id,
          status: existing.status,
          purchase_price: existing.purchase_price,
          winning_bid: existing.winning_bid,
        };
      }
      return { ...oz };
    });

    if (globalThis.__arkk_shared_wallets) {
      globalThis.__arkk_round1b_state.wallets = globalThis.__arkk_shared_wallets;
    } else {
      globalThis.__arkk_shared_wallets = globalThis.__arkk_round1b_state.wallets;
    }
  }
  return globalThis.__arkk_round1b_state;
}

export async function GET() {
  const state = getCentralState();
  const centralAActivity = globalThis.__arkk_central_state?.eventState?.current_activity;
  const currentActivity = state.round1BState.active
    ? state.eventState.current_activity
    : (centralAActivity || state.eventState.current_activity);

  return NextResponse.json({
    version: state.version,
    reset_epoch: globalThis.__arkk_reset_epoch || 0,
    round1BState: state.round1BState,
    zones: state.zones,
    wallets: state.wallets,
    eventState: {
      ...state.eventState,
      current_activity: currentActivity,
    },
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
    const { action, payload } = body;

    switch (action) {
      case 'START_ROUND_1B': {
        // Unlock frozen 50,000 for each team ONCE
        if (!state.round1BState.frozen_unlocked) {
          state.wallets = state.wallets.map((w) => {
            const frozen = w.frozen_balance || 0;
            return {
              ...w,
              usable_balance: w.usable_balance + frozen,
              frozen_balance: 0,
            };
          });
          globalThis.__arkk_shared_wallets = state.wallets;
          state.round1BState.frozen_unlocked = true;
        }

        state.round1BState = {
          ...state.round1BState,
          active: true,
          zone_study_mode: true,
          auction_open: false,
          auction_status: 'idle',
          current_auction_zone_id: undefined,
          current_bid_amount: undefined,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: undefined,
          bids: [],
        };

        state.eventState = {
          ...state.eventState,
          current_round: 1,
          current_activity: 'Round 1B - Zone Study & Auction Active',
          event_status: 'in_progress',
        };
        state.version += 1;
        break;
      }

      case 'END_ROUND_1B': {
        state.round1BState = {
          ...state.round1BState,
          active: false,
          auction_open: false,
          auction_status: 'idle',
          current_auction_zone_id: undefined,
          zone_study_mode: false,
          current_bid_amount: undefined,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: undefined,
        };
        state.zones = state.zones.map((z) =>
          z.status === 'auction_active' ? { ...z, status: 'available' } : z
        );
        state.eventState = {
          ...state.eventState,
          current_activity: 'Round 1B Completed',
        };
        state.version += 1;
        break;
      }

      case 'START_AUCTION': {
        const zoneId = payload?.zoneId;
        const targetZone = state.zones.find((z) => z.id === zoneId);
        if (!targetZone) {
          return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }

        // Set status to auction_active
        state.zones = state.zones.map((z) =>
          z.id === zoneId ? { ...z, status: 'auction_active' } : (z.status === 'auction_active' ? { ...z, status: 'available' } : z)
        );

        const initialBid = targetZone.starting_price;
        const nextIncrementBid = initialBid + 5000;

        state.round1BState = {
          ...state.round1BState,
          current_auction_zone_id: zoneId,
          auction_open: true,
          auction_status: 'bidding_active',
          zone_study_mode: false,
          current_bid_amount: initialBid,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: nextIncrementBid,
          bids: [], // clear bids for fresh auction
        };

        state.eventState = {
          ...state.eventState,
          current_activity: `Live Auction: Zone ${targetZone.zone_number} — ${targetZone.name}`,
        };
        state.version += 1;
        break;
      }

      case 'PLACE_BID': {
        const { teamId, teamName, teamNumber, amount, zoneId } = payload;
        
        if (!state.round1BState.current_auction_zone_id || state.round1BState.current_auction_zone_id !== zoneId) {
          return NextResponse.json({ error: 'Auction is not active for this zone' }, { status: 400 });
        }

        if (state.round1BState.auction_status === 'bidding_stopped') {
          return NextResponse.json({ error: 'Bidding has been stopped by the Admin' }, { status: 400 });
        }

        if (!state.round1BState.auction_open || state.round1BState.auction_status !== 'bidding_active') {
          return NextResponse.json({ error: 'Auction is not currently open for bidding' }, { status: 400 });
        }

        const wallet = state.wallets.find((w) => w.team_id === teamId);
        if (!wallet || wallet.usable_balance < amount) {
          return NextResponse.json({ error: 'Insufficient bidding balance' }, { status: 400 });
        }

        const expectedBid = state.round1BState.next_bid_amount || ((state.round1BState.current_bid_amount || 0) + 5000);
        
        if (amount < expectedBid) {
          return NextResponse.json({ 
            error: `Your bid of ${amount.toLocaleString()} ARK is outdated. Current lead bid is ${(state.round1BState.current_bid_amount || 0).toLocaleString()} ARK. Next valid bid is ${expectedBid.toLocaleString()} ARK.` 
          }, { status: 409 });
        }

        if (amount > expectedBid) {
          return NextResponse.json({ 
            error: `Invalid bid amount. Fixed increment requires exactly ${expectedBid.toLocaleString()} ARK.` 
          }, { status: 400 });
        }

        // Duplicate check: ensure no two bids claim the same increment
        const existingBids = state.round1BState.bids || [];
        const duplicate = existingBids.find((b) => b.amount === amount);
        if (duplicate) {
          return NextResponse.json({ 
            error: `Increment of ${amount.toLocaleString()} ARK was already won by ${duplicate.team_name}. Next bid is ${(amount + 5000).toLocaleString()} ARK.` 
          }, { status: 409 });
        }

        const serverTime = new Date().toISOString();
        const newBid: ZoneBid = {
          id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          zone_id: zoneId,
          team_id: teamId,
          team_name: teamName || `Team ${String(teamNumber || 1).padStart(2, '0')}`,
          team_number: teamNumber || 1,
          amount,
          sequence: existingBids.length + 1,
          timestamp: serverTime,
          server_timestamp: serverTime,
        };

        state.round1BState.bids = [newBid, ...existingBids];
        state.round1BState.current_bid_amount = amount;
        state.round1BState.current_bidder_id = teamId;
        state.round1BState.current_bidder_name = teamName || `Team ${String(teamNumber || 1).padStart(2, '0')}`;
        state.round1BState.current_bidder_number = teamNumber || 1;
        state.round1BState.next_bid_amount = amount + 5000;
        state.version += 1;
        break;
      }

      case 'STOP_BIDDING': {
        state.round1BState = {
          ...state.round1BState,
          auction_open: false,
          auction_status: 'bidding_stopped',
        };
        state.eventState = {
          ...state.eventState,
          current_activity: 'Bidding Stopped — Admin deciding winning team award',
        };
        state.version += 1;
        break;
      }

      case 'AWARD_ZONE': {
        const { zoneId, teamId, finalPrice } = payload;
        const zone = state.zones.find((z) => z.id === zoneId);
        if (!zone) {
          return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
        }

        const price = Number(payload.finalPrice ?? payload.amount ?? zone.starting_price);
        if (isNaN(price) || price < 0) {
          return NextResponse.json({ error: 'Invalid final award price' }, { status: 400 });
        }

        // Deduct from wallet
        state.wallets = state.wallets.map((w) => {
          if (w.team_id === teamId) {
            return {
              ...w,
              usable_balance: Math.max(0, w.usable_balance - price),
            };
          }
          return w;
        });
        globalThis.__arkk_shared_wallets = state.wallets;

        // Mark zone as sold
        state.zones = state.zones.map((z) => {
          if (z.id === zoneId) {
            return {
              ...z,
              status: 'sold',
              owner_team_id: teamId,
              winning_bid: price,
              purchase_price: price,
              final_value: price,
            };
          }
          return z;
        });

        state.round1BState = {
          ...state.round1BState,
          current_auction_zone_id: undefined,
          auction_open: false,
          auction_status: 'zone_awarded',
          zone_study_mode: true,
          current_bid_amount: undefined,
          current_bidder_id: undefined,
          current_bidder_name: undefined,
          current_bidder_number: undefined,
          next_bid_amount: undefined,
        };

        state.eventState = {
          ...state.eventState,
          current_activity: `Zone ${zone.zone_number} awarded to Team — Ready for next auction`,
        };
        state.version += 1;
        break;
      }

      case 'SYNC_CLIENT_STATE': {
        if (payload?.wallets) {
          state.wallets = payload.wallets;
          globalThis.__arkk_shared_wallets = state.wallets;
        }
        if (payload?.zones) {
          state.zones = payload.zones;
        }
        state.version += 1;
        break;
      }

      case 'RESET_ROUND_1B': {
        state.round1BState = {
          active: false,
          frozen_unlocked: false,
          zone_study_mode: true,
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
        state.zones = officialZones.map((z) => ({ ...z }));
        state.wallets = getInitialWallets();
        globalThis.__arkk_shared_wallets = state.wallets;
        state.version += 1;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      version: state.version,
      round1BState: state.round1BState,
      zones: state.zones,
      wallets: state.wallets,
      eventState: state.eventState,
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
