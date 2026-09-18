'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, syncRound1BWithServer } from '@/lib/store';
import { isParticipant, getSavedSession } from '@/lib/auth';
import { officialZones } from '@/lib/zones';
import { Zone, ZoneBid } from '@/types';

export default function ParticipantRound1BPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const zones = useStore((state) => state.zones);
  const round1BState = useStore((state) => state.round1BState);
  const eventState = useStore((state) => state.eventState);
  const placeZoneBid = useStore((state) => state.placeZoneBid);

  const [selectedZoneForModal, setSelectedZoneForModal] = useState<Zone | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // 1. Session check & restoration
  useEffect(() => {
    let user = currentUser;
    if (!user) {
      user = getSavedSession('participant');
      if (user && isParticipant(user)) {
        useStore.getState().setCurrentUser(user);
        return;
      }
    }
    if (!user || !isParticipant(user)) {
      router.push('/login');
    }
  }, [currentUser, router]);

  // 2. Real-time sync with server
  useEffect(() => {
    syncRound1BWithServer();
    const interval = setInterval(() => {
      syncRound1BWithServer();
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 3. Navigation Guard: If Round 1B is not active, return to participant dashboard
  useEffect(() => {
    if (!round1BState.active) {
      router.push('/participant/dashboard');
    }
  }, [round1BState.active, router]);

  const activeUser = currentUser || getSavedSession('participant');
  const myTeamId = activeUser?.team_id;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const myWallet = wallets.find((w) => w.team_id === myTeamId);
  const availableBiddingBalance = myWallet?.usable_balance ?? 0;

  // Active auction zone
  const activeAuctionZone = zones.find((z) => z.id === round1BState.current_auction_zone_id) ||
    officialZones.find((z) => z.id === round1BState.current_auction_zone_id);

  // Live bids for current active auction zone
  const currentBids: ZoneBid[] = useMemo(() => {
    if (!round1BState.bids || !activeAuctionZone) return [];
    return round1BState.bids.filter((b) => b.zone_id === activeAuctionZone.id);
  }, [round1BState.bids, activeAuctionZone]);

  const highestBid = currentBids.length > 0 ? currentBids[0].amount : (activeAuctionZone?.starting_price || 0);

  const currentLeadBid = round1BState.current_bid_amount || (currentBids.length > 0 ? highestBid : (activeAuctionZone?.starting_price || 0));
  const currentLeadBidderName = round1BState.current_bidder_name || (currentBids.length > 0 ? `${currentBids[0].team_name} (Team #${currentBids[0].team_number})` : 'No bids yet');
  const nextValidBid = round1BState.next_bid_amount || (currentLeadBid + 5000);
  const isBiddingStopped = round1BState.auction_status === 'bidding_stopped';
  const isMyTeamLeading = round1BState.current_bidder_id === myTeamId || (currentBids.length > 0 && currentBids[0].team_id === myTeamId);
  // Acquired Zone by this team
  const rawAcquiredZone = zones.find((z) => z.owner_team_id === myTeamId);
  const myAcquiredZone = rawAcquiredZone
    ? {
        ...(officialZones.find((oz) => oz.id === rawAcquiredZone.id) || {}),
        ...rawAcquiredZone,
      }
    : null;

  // Merged zones list (ensuring 20 official zones with current statuses)
  const displayZones = useMemo(() => {
    return officialZones.map((baseZone) => {
      const live = zones.find((z) => z.id === baseZone.id);
      return {
        ...baseZone,
        ...(live || {}),
      };
    });
  }, [zones]);

  const filteredZones = useMemo(() => {
    if (regionFilter === 'ALL') return displayZones;
    return displayZones.filter((z) => z.region.toUpperCase().includes(regionFilter.toUpperCase()));
  }, [displayZones, regionFilter]);

  const canAffordNextBid = availableBiddingBalance >= nextValidBid;

  // Bid submission handler: Fixed 5,000 ARK increment atomic bid
  const handleBidSubmit = async (amountToBid: number) => {
    setBidError(null);
    setBidSuccess(null);

    if (!activeAuctionZone || !round1BState.auction_open || isBiddingStopped) {
      setBidError('Bidding is not currently active for this Zone.');
      return;
    }

    if (!myTeamId) {
      setBidError('Team identification missing.');
      return;
    }

    if (amountToBid > availableBiddingBalance) {
      setBidError(`Cannot bid ${amountToBid.toLocaleString()} ARK: exceeds available balance of ${availableBiddingBalance.toLocaleString()} ARK.`);
      return;
    }

    try {
      placeZoneBid(myTeamId, activeAuctionZone.id, amountToBid);
      setBidSuccess(`Submitted bid of ${amountToBid.toLocaleString()} ARK!`);
      setTimeout(() => setBidSuccess(null), 4000);
    } catch (err: unknown) {
      setBidError((err as Error).message || 'Failed to submit bid');
    }
  };

  if (!activeUser || !isParticipant(activeUser) || !round1BState.active) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Header */}
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-6 py-4 sticky top-0 z-30 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              ARKK
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-base md:text-lg font-semibold text-gray-200">
              Round 1B — Zone Auction Arena
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Team Badge */}
            <div className="text-right">
              <p className="text-sm font-bold text-gray-100">{myTeam?.team_name || 'Participant Team'}</p>
              <p className="text-xs text-purple-400 font-medium">Team #{myTeam?.team_number || '1'}</p>
            </div>

            {/* Available Bidding Balance Badge (Round 1A remaining + 50,000 unlocked) */}
            <div
              id="round1b-wallet-balance"
              className="px-4 py-2 bg-gray-900 border border-green-500/50 rounded-2xl flex flex-col items-end shadow-inner"
            >
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Bidding Balance
              </span>
              <span className="text-lg md:text-xl font-black text-green-400 font-mono">
                {availableBiddingBalance.toLocaleString()} ARK
              </span>
            </div>

            {/* Back to Dashboard */}
            <button
              onClick={() => router.push('/participant/dashboard')}
              className="text-xs text-gray-400 hover:text-white px-3.5 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* ============================================================ */}
        {/* FINANCIAL UNLOCK NOTIFICATION BANNER                         */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-r from-purple-950/70 via-gray-900 to-blue-950/70 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">
              🔓
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Round 1B Financial Unlock Applied
              </p>
              <p className="text-xs text-gray-400">
                Your 50,000 ARK frozen balance from Round 1A has been unlocked and added to your available bidding wallet.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-green-950/50 border border-green-500/40 text-green-300 font-mono text-xs font-bold rounded-full">
              Current Available: {availableBiddingBalance.toLocaleString()} ARK
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. CURRENT ACTIVE AUCTION ZONE (HERO SECTION)                */}
        {/* Only active when Admin has selected and started auction     */}
        {/* ============================================================ */}
        {activeAuctionZone && (round1BState.auction_open || isBiddingStopped) ? (
          <div className="bg-gray-900/90 border-2 border-yellow-500/70 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Auction Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                {isBiddingStopped ? (
                  <div className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-black rounded-full uppercase tracking-wider flex items-center space-x-1.5 shadow">
                    <span>⏹</span>
                    <span>BIDDING STOPPED</span>
                  </div>
                ) : (
                  <div className="px-3.5 py-1.5 bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-xs font-black rounded-full uppercase tracking-wider flex items-center space-x-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span>CURRENT ACTIVE AUCTION</span>
                  </div>
                )}
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold rounded-xl">
                  {activeAuctionZone.region}
                </span>
                <span className="px-2.5 py-1 bg-blue-900/40 border border-blue-600 text-blue-300 text-xs font-bold rounded-xl">
                  {activeAuctionZone.tier || 'Standard'}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400 uppercase">Starting Bid:</span>
                <span className="text-base font-bold font-mono text-gray-300">
                  {activeAuctionZone.starting_price.toLocaleString()} ARK
                </span>
              </div>
            </div>

            {/* Zone Identity & Details Grid */}
            <div className="py-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <div className="flex items-baseline space-x-3">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      ZONE {activeAuctionZone.zone_number} — {activeAuctionZone.name}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 italic">
                    {activeAuctionZone.terrain}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 font-semibold block uppercase mb-0.5">Borders (Next to):</span>
                    <span className="text-gray-200 font-medium">{activeAuctionZone.next_to || activeAuctionZone.neighboring_zones}</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 font-semibold block uppercase mb-0.5">In the Ground:</span>
                    <span className="text-yellow-300 font-medium">{activeAuctionZone.in_the_ground || activeAuctionZone.deposits}</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 font-semibold block uppercase mb-0.5">Production (MAKES):</span>
                    <span className="text-emerald-300 font-semibold">{activeAuctionZone.makes || activeAuctionZone.yield}</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 font-semibold block uppercase mb-0.5">Must Build:</span>
                    <span className="text-cyan-300 font-medium">{activeAuctionZone.must_build}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1">
                  <span className="text-amber-400 font-bold uppercase tracking-wider block">Operational Risk (GOES WRONG):</span>
                  <p className="text-gray-300">{activeAuctionZone.goes_wrong || activeAuctionZone.problem}</p>
                </div>

                <button
                  onClick={() => setSelectedZoneForModal(activeAuctionZone)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline flex items-center space-x-1"
                >
                  <span>View Complete Official Zone Card →</span>
                </button>
              </div>

              {/* Bidding Control Panel */}
              <div className="bg-gray-950/90 border-2 border-yellow-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                    <span className="text-xs uppercase font-black tracking-wider text-gray-400">CURRENT BID</span>
                    <span className="text-2xl font-black font-mono text-yellow-400">
                      {currentLeadBid.toLocaleString()} ARK
                    </span>
                  </div>

                  <div className="py-2.5 border-b border-gray-800/70 space-y-1">
                    <span className="text-[11px] uppercase font-bold text-gray-400 block">CURRENT BIDDER</span>
                    <p className={`text-sm font-bold ${isMyTeamLeading ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {currentLeadBidderName}
                      {isMyTeamLeading && (
                        <span className="ml-2 text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/50">
                          ★ Your Team
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-400">NEXT BID</span>
                    <span className="text-xl font-mono font-black text-emerald-400">
                      {nextValidBid.toLocaleString()} ARK
                    </span>
                  </div>
                </div>

                {/* Status / Single Fixed +5,000 ARK Increment Button */}
                {isBiddingStopped ? (
                  <div className="p-3.5 bg-rose-950/70 border border-rose-500/60 rounded-xl text-center space-y-1">
                    <span className="px-2.5 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider inline-block">
                      ⏹ BIDDING STOPPED
                    </span>
                    <p className="text-xs text-rose-200 font-semibold">
                      Bidding has been stopped by the Admin.
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Current lead bid is frozen at {currentLeadBid.toLocaleString()} ARK. Awaiting final award decision.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      id="participant-bid-btn"
                      disabled={!canAffordNextBid || isMyTeamLeading || isBiddingStopped}
                      onClick={() => handleBidSubmit(nextValidBid)}
                      className={`w-full py-4 px-4 rounded-2xl font-black text-base md:text-lg tracking-wider transition-all flex flex-col items-center justify-center shadow-lg border ${
                        !canAffordNextBid
                          ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                          : isMyTeamLeading
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 cursor-default'
                          : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-black border-yellow-400 cursor-pointer active:scale-95 shadow-yellow-500/20'
                      }`}
                    >
                      <span>
                        {isMyTeamLeading
                          ? '✓ YOU ARE THE LEAD BIDDER'
                          : !canAffordNextBid
                          ? `INSUFFICIENT BALANCE (NEED ${nextValidBid.toLocaleString()} ARK)`
                          : `BID ${nextValidBid.toLocaleString()} ARK`}
                      </span>
                      <span className="text-[11px] font-normal opacity-80 mt-0.5">
                        {isMyTeamLeading
                          ? `Holding top position at ${currentLeadBid.toLocaleString()} ARK`
                          : `Fixed 5,000 ARK increment over lead bid`}
                      </span>
                    </button>

                    <p className="text-[10px] text-center text-gray-400">
                      Bids increase by exactly 5,000 ARK. First valid click recorded by the server wins the increment.
                    </p>
                  </div>
                )}

                {/* Feedback Alerts */}
                {bidError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
                    ⚠️ {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold">
                    ✓ {bidSuccess}
                  </div>
                )}

                {/* Live Bids Feed */}
                {currentBids.length > 0 && (
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">
                      Recent Bids Stream
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {currentBids.slice(0, 5).map((bid) => (
                        <div
                          key={bid.id}
                          className="flex items-center justify-between p-1.5 bg-gray-900/60 rounded-lg border border-gray-800"
                        >
                          <span className="text-gray-300 font-medium truncate max-w-[120px]">
                            {bid.team_name}
                          </span>
                          <span className="font-mono font-bold text-yellow-400">
                            {bid.amount.toLocaleString()} ARK
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/70 border border-gray-800 rounded-3xl p-6 text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-purple-300 font-bold tracking-wider text-xs uppercase">
                Zone Study Mode Active
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Study Available Zones Below
            </h3>
            <p className="text-gray-400 text-xs md:text-sm max-w-xl mx-auto">
              The Admin will activate the next Zone for auction shortly. Review all 20 zones, calculate toll distances, and plan your bidding strategy.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. ACQUIRED ZONE SHOWCASE (MY ACQUIRED ZONE)                 */}
        {/* ============================================================ */}
        {myAcquiredZone && (
          <div className="bg-gradient-to-r from-emerald-950/70 via-gray-900 to-teal-950/70 border-2 border-emerald-500/70 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    MY ACQUIRED ZONE
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-white">
                    ZONE {String(myAcquiredZone.zone_number).padStart(2, '0')} — {myAcquiredZone.name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold rounded-full">
                  ✓ Owned by Your Team
                </span>
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold rounded-full">
                  {myAcquiredZone.region}
                </span>
              </div>
            </div>

            {/* Four Distinct Economic Metrics Required by Single Source of Truth */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Zone Economic Valuation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-gray-950/90 rounded-2xl border border-green-500/50 shadow-inner">
                  <span className="text-gray-400 block text-[11px] font-bold uppercase">ZONE PURCHASE PRICE</span>
                  <span className="text-xl font-mono font-black text-green-400 block mt-1">
                    {(myAcquiredZone.purchase_price || myAcquiredZone.winning_bid || myAcquiredZone.final_value || 0).toLocaleString()} ARK
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Amount paid in auction</span>
                </div>

                <div className="p-3.5 bg-gray-950/90 rounded-2xl border border-purple-500/50 shadow-inner">
                  <span className="text-gray-400 block text-[11px] font-bold uppercase">ZONE TOTAL VALUE</span>
                  <span className="text-xl font-mono font-black text-purple-300 block mt-1">
                    {(myAcquiredZone.zone_total_value || myAcquiredZone.final_value || 0).toLocaleString()} ARK
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Zone Book total value</span>
                </div>

                <div className="p-3.5 bg-gray-950/90 rounded-2xl border border-yellow-500/50 shadow-inner">
                  <span className="text-gray-400 block text-[11px] font-bold uppercase">TOTAL RAW MATERIAL VALUE</span>
                  <span className="text-xl font-mono font-black text-yellow-400 block mt-1">
                    {(myAcquiredZone.total_raw_material_value || 0).toLocaleString()} ARK
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Per-cycle raw yield value</span>
                </div>

                <div className="p-3.5 bg-gray-950/90 rounded-2xl border border-cyan-500/50 shadow-inner">
                  <span className="text-gray-400 block text-[11px] font-bold uppercase">GENERATION / OUTPUT VALUE</span>
                  <span className="text-sm font-mono font-bold text-cyan-300 block mt-1 leading-snug">
                    {myAcquiredZone.generation_output_value || myAcquiredZone.makes || myAcquiredZone.yield || 'N/A'}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Cycle output capacity</span>
                </div>
              </div>
            </div>

            {/* Raw Materials Breakdown Table */}
            {myAcquiredZone.raw_materials && myAcquiredZone.raw_materials.length > 0 && (
              <div className="p-4 bg-gray-950/90 rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                    RAW MATERIALS
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    Material Yield & Pricing Breakdown
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-900 text-gray-400 uppercase font-bold border-b border-gray-800">
                      <tr>
                        <th className="py-2.5 px-3">Raw Material Name</th>
                        <th className="py-2.5 px-3">Quantity</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total Material Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 font-mono">
                      {myAcquiredZone.raw_materials.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-gray-900/60">
                          <td className="py-2 px-3 text-white font-semibold font-sans">{rm.name}</td>
                          <td className="py-2 px-3 text-yellow-300 font-bold">{rm.quantity}</td>
                          <td className="py-2 px-3 text-gray-400 font-sans">{rm.unit}</td>
                          <td className="py-2 px-3 text-gray-300">{rm.price.toLocaleString()} ARK</td>
                          <td className="py-2 px-3 text-right text-emerald-400 font-bold">{rm.total_value.toLocaleString()} ARK</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-700 bg-gray-900 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-gray-300 uppercase tracking-wider">
                          TOTAL RAW MATERIAL VALUE
                        </td>
                        <td className="py-2.5 px-3 text-right text-yellow-400 font-mono text-sm">
                          {(myAcquiredZone.total_raw_material_value || 0).toLocaleString()} ARK
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800">
                <span className="text-gray-400 font-semibold block uppercase">Terrain:</span>
                <span className="text-gray-200">{myAcquiredZone.terrain}</span>
              </div>
              <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800">
                <span className="text-gray-400 font-semibold block uppercase">Borders (Next to):</span>
                <span className="text-gray-200">{myAcquiredZone.next_to || myAcquiredZone.neighboring_zones}</span>
              </div>
              <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800">
                <span className="text-gray-400 font-semibold block uppercase">In the Ground:</span>
                <span className="text-yellow-300 font-semibold">{myAcquiredZone.in_the_ground || myAcquiredZone.deposits}</span>
              </div>
              <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800">
                <span className="text-gray-400 font-semibold block uppercase">Cycle Yield (MAKES):</span>
                <span className="text-emerald-400 font-bold">{myAcquiredZone.makes || myAcquiredZone.yield}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedZoneForModal(myAcquiredZone)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
              >
                <span>View Full Acquired Zone Dossier</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. COMPLETE 20-ZONE STUDY LIBRARY                            */}
        {/* ============================================================ */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Zone Library — All 25 Zones
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Official specifications extracted directly from the ARKK Zone Book. Click any zone to view its complete card.
              </p>
            </div>

            {/* Region Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-gray-950 rounded-2xl border border-gray-800 text-xs font-semibold">
              {['ALL', 'THE DELTA', 'THE ASH BELT', 'THE SPINE', 'THE HOLLOW', 'THE GRID'].map((reg) => (
                <button
                  key={reg}
                  onClick={() => setRegionFilter(reg)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    regionFilter === reg
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {reg === 'ALL' ? 'All (25)' : reg.replace('THE ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredZones.map((zone) => {
              const isCurrentAuction = round1BState.current_auction_zone_id === zone.id && round1BState.auction_open;
              const isSold = zone.status === 'sold';
              const ownerTeam = zone.owner_team_id ? teams.find((t) => t.id === zone.owner_team_id) : null;
              const isMyOwned = zone.owner_team_id === myTeamId;

              return (
                <div
                  key={zone.id}
                  id={`zone-card-${zone.zone_number}`}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                    isCurrentAuction
                      ? 'bg-yellow-950/30 border-yellow-500/80 ring-2 ring-yellow-500/40 shadow-lg shadow-yellow-500/10'
                      : isMyOwned
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md'
                      : isSold
                      ? 'bg-gray-950/60 border-gray-800 opacity-75'
                      : 'bg-gray-900/90 border-gray-800 hover:border-purple-500/60 hover:bg-gray-850'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-xs text-purple-400">
                        ZONE {zone.zone_number}
                      </span>
                      {zone.tier && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-semibold">
                          {zone.tier}
                        </span>
                      )}
                    </div>

                    {isCurrentAuction ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-full animate-pulse">
                        ⚡ LIVE AUCTION
                      </span>
                    ) : isMyOwned ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-full">
                        ✓ YOUR ZONE
                      </span>
                    ) : isSold ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full truncate max-w-[110px]">
                        Sold: {ownerTeam?.team_name || 'Acquired'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded-full">
                        AVAILABLE
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="py-3 space-y-1.5">
                    <h4 className="font-black text-base text-white tracking-tight leading-snug">
                      {zone.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {zone.region} {zone.next_to ? `· Next to: ${zone.next_to}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-300 italic line-clamp-2">
                      {zone.description || zone.terrain}
                    </p>

                    <div className="pt-2 border-t border-gray-800/60 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Stock:</span>
                        <span className="text-yellow-400 font-bold text-right truncate max-w-[150px]">
                          {zone.stock || zone.in_the_ground?.replace(' — names only. The amount is sealed.', '') || zone.deposits}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500">Space / Used:</span>
                        <span className="text-gray-300 font-mono">
                          {zone.space ?? '-'} / {zone.used ?? '-'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500">Free:</span>
                        {zone.free !== undefined && zone.free < 0 ? (
                          <span className="px-1.5 py-0.5 bg-rose-950/90 border border-rose-500 text-rose-300 font-black rounded text-[10px] animate-pulse">
                            {zone.free} OVER CAPACITY
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono font-bold">
                            {zone.free ?? '-'} free
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-gray-800/40">
                        <span className="text-gray-500">
                          {isCurrentAuction && round1BState.auction_open ? 'Start Price:' : (isSold || isMyOwned) ? 'Price:' : 'Price:'}
                        </span>
                        {isCurrentAuction && round1BState.auction_open ? (
                          <span className="font-mono font-bold text-yellow-400">
                            {zone.starting_price.toLocaleString()} ARK
                          </span>
                        ) : (isSold || isMyOwned) ? (
                          <span className="font-mono font-bold text-emerald-400">
                            {(zone.purchase_price || zone.winning_bid || zone.starting_price).toLocaleString()} ARK
                          </span>
                        ) : (
                          <span className="font-mono text-gray-500 text-[11px] flex items-center space-x-1">
                            <span>🔒</span>
                            <span>Sealed until Auction</span>
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Worth:</span>
                        <span className="text-gray-400 font-mono font-bold text-[10px] px-1.5 py-0.5 bg-gray-950 rounded border border-gray-800">
                          {isSold || isMyOwned ? `${(zone.zone_total_value || zone.final_value || zone.total_raw_material_value || 0).toLocaleString()} ARK` : 'SEALED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    <button
                      id={`view-details-btn-${zone.zone_number}`}
                      onClick={() => setSelectedZoneForModal(zone)}
                      className="w-full py-2 bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all text-center"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* COMPLETE ZONE DETAILS MODAL (PRESERVES ALL FIELDS VERBATIM)   */}
      {/* ============================================================ */}
      {selectedZoneForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-gray-800">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-purple-600/30 border border-purple-500 text-purple-300 font-mono font-bold text-xs rounded-lg">
                    ZONE {selectedZoneForModal.zone_number}
                  </span>
                  <span className="px-2.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-semibold rounded-lg">
                    {selectedZoneForModal.region}
                  </span>
                  {selectedZoneForModal.tier && (
                    <span className="px-2.5 py-0.5 bg-blue-900/40 border border-blue-600 text-blue-300 text-xs font-bold rounded-lg">
                      {selectedZoneForModal.tier}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white">
                  {selectedZoneForModal.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedZoneForModal(null)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Complete Verbatim Card Fields */}
            <div className="space-y-4 text-xs md:text-sm">
              <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400 font-semibold uppercase text-xs">Price Status:</span>
                {round1BState.current_auction_zone_id === selectedZoneForModal.id && round1BState.auction_open ? (
                  <span className="text-base font-bold font-mono text-yellow-400 animate-pulse">
                    Starting Price: {selectedZoneForModal.starting_price.toLocaleString()} ARK (⚡ Live Auction)
                  </span>
                ) : selectedZoneForModal.owner_team_id ? (
                  <span className="text-base font-bold font-mono text-emerald-400">
                    Purchase Price: {(selectedZoneForModal.purchase_price || selectedZoneForModal.winning_bid || selectedZoneForModal.final_value || selectedZoneForModal.starting_price).toLocaleString()} ARK
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 flex items-center space-x-1.5">
                    <span>🔒</span>
                    <span>Starting Price Sealed until Admin Starts Auction</span>
                  </span>
                )}
              </div>

              {/* If acquired, display the 4 required distinct economic metrics */}
              {selectedZoneForModal.owner_team_id && (
                <div className="p-4 bg-gray-950/80 rounded-2xl border border-emerald-500/30 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Acquired Economic Metrics
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">ZONE PURCHASE PRICE</span>
                      <span className="font-mono font-bold text-green-400">
                        {(selectedZoneForModal.purchase_price || selectedZoneForModal.winning_bid || selectedZoneForModal.final_value || 0).toLocaleString()} ARK
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">ZONE TOTAL VALUE</span>
                      <span className="font-mono font-bold text-purple-300">
                        {(selectedZoneForModal.zone_total_value || selectedZoneForModal.final_value || 0).toLocaleString()} ARK
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">TOTAL RAW MATERIAL VALUE</span>
                      <span className="font-mono font-bold text-yellow-400">
                        {(selectedZoneForModal.total_raw_material_value || 0).toLocaleString()} ARK
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">GENERATION / OUTPUT VALUE</span>
                      <span className="font-mono font-bold text-cyan-300 text-[11px] truncate block">
                        {selectedZoneForModal.generation_output_value || selectedZoneForModal.makes || selectedZoneForModal.yield || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Materials breakdown */}
              {selectedZoneForModal.raw_materials && selectedZoneForModal.raw_materials.length > 0 && (
                <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 font-bold uppercase text-[11px] block">Raw Materials:</span>
                    {selectedZoneForModal.owner_team_id && (
                      <span className="text-[10px] text-gray-400">
                        Total Value: {(selectedZoneForModal.total_raw_material_value || 0).toLocaleString()} ARK
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-900 text-gray-400 uppercase font-bold border-b border-gray-800">
                        <tr>
                          <th className="py-1.5 px-2">Material</th>
                          <th className="py-1.5 px-2">Quantity</th>
                          <th className="py-1.5 px-2">Unit</th>
                          {selectedZoneForModal.owner_team_id && (
                            <>
                              <th className="py-1.5 px-2">Price</th>
                              <th className="py-1.5 px-2 text-right">Total Value</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 font-mono">
                        {selectedZoneForModal.raw_materials.map((rm, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2 text-white font-sans">{rm.name}</td>
                            <td className="py-1.5 px-2 text-yellow-300 font-bold">{rm.quantity}</td>
                            <td className="py-1.5 px-2 text-gray-400 font-sans">{rm.unit}</td>
                            {selectedZoneForModal.owner_team_id && (
                              <>
                                <td className="py-1.5 px-2 text-gray-300">{rm.price.toLocaleString()} ARK</td>
                                <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">{rm.total_value.toLocaleString()} ARK</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Block 1: Shown from the start (Round 1B bidding screen) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Space:</span>
                  <span className="text-white font-mono font-bold text-sm">{selectedZoneForModal.space ?? '-'}</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Stock:</span>
                  <span className="text-yellow-400 font-mono font-bold text-xs truncate block">{selectedZoneForModal.stock || selectedZoneForModal.in_the_ground || '-'}</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Used:</span>
                  <span className="text-gray-200 font-mono font-bold text-sm">{selectedZoneForModal.used ?? '-'}</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Free:</span>
                  {selectedZoneForModal.free !== undefined && selectedZoneForModal.free < 0 ? (
                    <span className="px-1.5 py-0.5 bg-rose-950 border border-rose-500 text-rose-300 font-black rounded text-[10px] animate-pulse inline-block">
                      {selectedZoneForModal.free} OVER CAPACITY
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-mono font-bold text-sm">{selectedZoneForModal.free ?? '-'} free</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[11px] block">Next To (Borders):</span>
                  <p className="text-gray-200 font-medium">{selectedZoneForModal.next_to || selectedZoneForModal.neighboring_zones}</p>
                  <p className="text-[10px] text-gray-500 italic">Trading with bordering zones costs no toll, ever.</p>
                </div>

                <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[11px] block">Description / Settlement:</span>
                  <p className="text-gray-200 text-xs">{selectedZoneForModal.description || selectedZoneForModal.terrain}</p>
                </div>
              </div>

              <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-yellow-400 font-bold uppercase text-[11px] block">In the Ground:</span>
                <p className="text-white font-medium">{selectedZoneForModal.in_the_ground || selectedZoneForModal.deposits}</p>
              </div>

              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold uppercase text-[11px] block">Cycle Production (MAKES):</span>
                <p className="text-white font-mono font-semibold">{selectedZoneForModal.makes || selectedZoneForModal.yield}</p>
              </div>

              <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/40 rounded-xl space-y-1">
                <span className="text-cyan-400 font-bold uppercase text-[11px] block">Required Construction (MUST BUILD):</span>
                <p className="text-gray-200">{selectedZoneForModal.must_build}</p>
              </div>

              <div className="p-3.5 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-1">
                <span className="text-rose-400 font-bold uppercase text-[11px] block">Operational Hazard (GOES WRONG):</span>
                <p className="text-gray-300">{selectedZoneForModal.goes_wrong || selectedZoneForModal.problem}</p>
              </div>

              {/* Strategic Dossier: Advantages, Risks, Opportunities from Word Document */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectedZoneForModal.advantages && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                    <span className="text-emerald-400 font-bold uppercase text-[11px] block">Advantages:</span>
                    <p className="text-gray-300 text-xs">{selectedZoneForModal.advantages}</p>
                  </div>
                )}
                {selectedZoneForModal.risks && (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1">
                    <span className="text-rose-400 font-bold uppercase text-[11px] block">Risks:</span>
                    <p className="text-gray-300 text-xs">{selectedZoneForModal.risks}</p>
                  </div>
                )}
                {selectedZoneForModal.opportunities && (
                  <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-1">
                    <span className="text-blue-400 font-bold uppercase text-[11px] block">Opportunities:</span>
                    <p className="text-gray-300 text-xs">{selectedZoneForModal.opportunities}</p>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-purple-400 font-bold uppercase text-[11px] block">Supply & Trade Balance (HAS AND NEEDS):</span>
                <p className="text-gray-300">{selectedZoneForModal.has_and_needs}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase text-[11px]">Round 5 Material:</span>
                  <span className="text-white font-bold">{selectedZoneForModal.round_5_material || 'Disclosed in R5'}</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase text-[11px]">Ownership Status:</span>
                  <span className="font-bold text-gray-200">
                    {selectedZoneForModal.owner_team_id
                      ? `Acquired by ${teams.find((t) => t.id === selectedZoneForModal.owner_team_id)?.team_name || 'Team'}`
                      : selectedZoneForModal.status === 'auction_active'
                      ? '⚡ Current Auction'
                      : 'Available for Auction'}
                  </span>
                </div>
              </div>

              {selectedZoneForModal.note && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-500/50 rounded-xl space-y-1">
                  <span className="text-amber-400 font-bold uppercase text-[11px] block">Special Zone Intelligence / Notes:</span>
                  <p className="text-amber-200 text-xs leading-relaxed">{selectedZoneForModal.note}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedZoneForModal(null)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase"
              >
                Close Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End of modals */}
    </div>
  );
}
