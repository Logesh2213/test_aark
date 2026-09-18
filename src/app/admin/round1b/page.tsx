'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, syncRound1BWithServer } from '@/lib/store';
import { isAdmin, getSavedSession } from '@/lib/auth';
import { officialZones } from '@/lib/zones';
import { Zone, ZoneBid } from '@/types';

export default function AdminRound1BPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const zones = useStore((state) => state.zones);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const round1BState = useStore((state) => state.round1BState);
  const eventState = useStore((state) => state.eventState);
  
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [finalAwardPrice, setFinalAwardPrice] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showEndRoundModal, setShowEndRoundModal] = useState<boolean>(false);
  const [selectedZoneForModal, setSelectedZoneForModal] = useState<Zone | null>(null);

  const startRound1B = useStore((state) => state.startRound1B);
  const endRound1B = useStore((state) => state.endRound1B);
  const startZoneAuction = useStore((state) => state.startZoneAuction);
  const stopZoneBidding = useStore((state) => state.stopZoneBidding);
  const awardZoneToTeam = useStore((state) => state.awardZoneToTeam);
  const updateRound1BState = useStore((state) => state.updateRound1BState);
  const addAuditLog = useStore((state) => state.addAuditLog);

  // 1. Session check & restoration
  useEffect(() => {
    let user = currentUser;
    if (!user) {
      user = getSavedSession('admin');
      if (user && isAdmin(user)) {
        useStore.getState().setCurrentUser(user);
        return;
      }
    }
    if (!user || !isAdmin(user)) {
      router.push('/login');
    }
  }, [currentUser, router]);

  // 2. Real-time server sync
  useEffect(() => {
    syncRound1BWithServer();
    const interval = setInterval(() => {
      syncRound1BWithServer();
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const activeUser = currentUser || getSavedSession('admin');
  if (!activeUser || !isAdmin(activeUser)) {
    return null;
  }

  // Merged zones list (guaranteeing 20 official zones with real-time states)
  const displayZones = useMemo(() => {
    return officialZones.map((baseZone) => {
      const live = zones.find((z) => z.id === baseZone.id);
      return {
        ...baseZone,
        ...(live || {}),
      };
    });
  }, [zones]);

  const activeTeams = teams.filter((t) => t.active && !t.eliminated);
  const activeAuctionZone = displayZones.find((z) => z.id === round1BState.current_auction_zone_id);

  // Live bids for currently active auction zone
  const currentBids: ZoneBid[] = useMemo(() => {
    if (!round1BState.bids || !activeAuctionZone) return [];
    return round1BState.bids.filter((b) => b.zone_id === activeAuctionZone.id);
  }, [round1BState.bids, activeAuctionZone]);

  const highestBid = currentBids.length > 0 ? currentBids[0] : null;

  // Auto-fill selected team and price when highest bid arrives, if not already filled
  useEffect(() => {
    if (highestBid) {
      if (!selectedTeamId) {
        setSelectedTeamId(highestBid.team_id);
      }
      setFinalAwardPrice(String(highestBid.amount));
    } else if (activeAuctionZone) {
      setFinalAwardPrice(String(activeAuctionZone.starting_price));
    }
  }, [highestBid, activeAuctionZone, selectedTeamId]);

  // Handler: Start Round 1B (Unlocks 50,000 ARK frozen balance for each team once)
  const handleStartRound = () => {
    startRound1B();
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'START_ROUND_1B',
      timestamp: new Date().toISOString(),
    });
  };

  // Handler: End Round 1B
  const handleEndRound = () => {
    endRound1B();
    setShowEndRoundModal(false);
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'END_ROUND_1B',
      timestamp: new Date().toISOString(),
    });
  };

  // Handler: Start Auction for a Zone
  const handleStartAuction = (zoneIdToStart?: string) => {
    const targetId = zoneIdToStart || selectedZoneId;
    if (!targetId) {
      alert('Please select a Zone to start the auction.');
      return;
    }

    startZoneAuction(targetId);
    setSelectedTeamId('');
    setFinalAwardPrice('');
    setSelectedZoneId('');

    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'START_AUCTION',
      new_value: targetId,
      timestamp: new Date().toISOString(),
    });
  };

  // Handler: Open Award Confirmation Modal
  const handlePrepareAward = () => {
    if (!activeAuctionZone) {
      alert('No active auction in progress.');
      return;
    }
    if (!selectedTeamId) {
      alert('Please select the winning team.');
      return;
    }
    const price = parseInt(finalAwardPrice);
    if (!price || price <= 0) {
      alert('Please enter a valid final winning price.');
      return;
    }

    const wallet = wallets.find((w) => w.team_id === selectedTeamId);
    if (!wallet || wallet.usable_balance < price) {
      alert(`Selected team has insufficient balance (${wallet?.usable_balance.toLocaleString() || 0} ARK available).`);
      return;
    }

    setShowConfirmModal(true);
  };

  // Handler: Confirm Award
  const handleConfirmAward = () => {
    if (!activeAuctionZone || !selectedTeamId) return;
    const price = parseInt(finalAwardPrice);

    try {
      awardZoneToTeam(activeAuctionZone.id, selectedTeamId, price);
      setShowConfirmModal(false);
      setSelectedTeamId('');
      setFinalAwardPrice('');

      addAuditLog({
        id: `log_${Date.now()}`,
        user_id: activeUser.id,
        team_id: selectedTeamId,
        action: 'AWARD_ZONE',
        new_value: `Zone ${activeAuctionZone.zone_number} — ${price} ARK`,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      alert((err as Error).message || 'Error awarding zone');
    }
  };

  // Handler: Cancel / Reset Current Auction
  const handleCancelAuction = () => {
    if (confirm('Cancel active auction for this zone and return to Zone Study mode?')) {
      updateRound1BState({
        current_auction_zone_id: undefined,
        auction_open: false,
        zone_study_mode: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-30 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              ARKK
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-lg font-bold text-gray-200">
              Admin Control — Round 1B (Zone Auction)
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              round1BState.auction_open
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500 animate-pulse'
                : round1BState.active
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {round1BState.auction_open
                ? 'Live Auction Active'
                : round1BState.active
                ? 'Round 1B Active'
                : 'Round 1B Not Started'}
            </span>

            {round1BState.active && (
              <button
                id="header-end-round1b-btn"
                onClick={() => setShowEndRoundModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1"
              >
                <span>⏹</span>
                <span>End Round 1B</span>
              </button>
            )}

            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-xs text-gray-400 hover:text-white px-3 py-2 bg-gray-800/80 rounded-xl"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* ============================================================ */}
        {/* 1. ROUND 1B LIFECYCLE & FINANCIAL UNLOCK CONTROL             */}
        {/* ============================================================ */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Round 1B Lifecycle</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Starting Round 1B unlocks the 50,000 ARK frozen balance for each team once and routes participants into the Zone Arena.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {!round1BState.active ? (
                <div className="flex items-center space-x-2">
                  <button
                    id="start-round1b-btn"
                    onClick={handleStartRound}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center space-x-2"
                  >
                    <span>▶</span>
                    <span>{round1BState.frozen_unlocked ? 'RESUME / START ROUND 1B' : 'START ROUND 1B'}</span>
                  </button>
                  {round1BState.frozen_unlocked && (
                    <span className="px-3 py-2 bg-gray-800 text-gray-400 font-semibold text-xs rounded-xl border border-gray-700">
                      Round 1B Ended
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3.5 py-2 bg-green-950/60 border border-green-500/40 text-green-300 font-bold text-xs rounded-xl flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                    <span>Round 1B Active & Synced</span>
                  </span>
                  <span className="px-3 py-2 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold rounded-xl">
                    🔓 50,000 ARK Frozen Unlocked
                  </span>
                  <button
                    id="lifecycle-end-round1b-btn"
                    onClick={() => setShowEndRoundModal(true)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>⏹</span>
                    <span>END ROUND 1B</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between text-xs text-gray-400">
            <div>
              <span>Current Activity: </span>
              <span className="font-semibold text-white">{eventState.current_activity}</span>
            </div>
            <div>
              <span>Participant State: </span>
              <span className="text-purple-400 font-mono">
                {!round1BState.active
                  ? 'Dashboard (Round 1B Locked)'
                  : round1BState.auction_open
                  ? `Live Auction: Zone ${activeAuctionZone?.zone_number || ''}`
                  : 'Zone Study Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. ACTIVE AUCTION LIVE MONITOR & AWARD CONTROL               */}
        {/* ============================================================ */}
        {activeAuctionZone && (round1BState.auction_open || round1BState.auction_status === 'bidding_stopped') ? (
          <div className="bg-gray-900 border-2 border-yellow-500/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                {round1BState.auction_status === 'bidding_stopped' ? (
                  <div className="px-3.5 py-1 bg-rose-600 text-white font-black text-xs rounded-full uppercase flex items-center space-x-1.5 shadow">
                    <span>⏹</span>
                    <span>BIDDING STOPPED</span>
                  </div>
                ) : (
                  <div className="px-3.5 py-1 bg-yellow-500 text-black font-black text-xs rounded-full uppercase flex items-center space-x-1.5 shadow animate-pulse">
                    <span>⚡</span>
                    <span>LIVE BIDDING IN PROGRESS</span>
                  </div>
                )}
                <span className="text-sm font-bold text-gray-300">
                  Zone {activeAuctionZone.zone_number} — {activeAuctionZone.name}
                </span>
                <span className="px-2.5 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-lg">
                  {activeAuctionZone.region}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {round1BState.auction_status !== 'bidding_stopped' && (
                  <button
                    id="admin-stop-bidding-btn"
                    onClick={() => {
                      stopZoneBidding();
                      addAuditLog({
                        id: `log_${Date.now()}`,
                        user_id: activeUser.id,
                        action: 'STOP_BIDDING',
                        new_value: `Zone ${activeAuctionZone.zone_number}`,
                        timestamp: new Date().toISOString(),
                      });
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center space-x-1.5"
                  >
                    <span>⏹</span>
                    <span>STOP BIDDING</span>
                  </button>
                )}

                <button
                  onClick={handleCancelAuction}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-2 bg-red-950/40 border border-red-800 rounded-xl transition-colors"
                >
                  Cancel Auction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
              {/* Left Column: Zone Brief */}
              <div className="lg:col-span-4 space-y-3">
                <div>
                  <h3 className="text-2xl font-black text-white">
                    ZONE {activeAuctionZone.zone_number}: {activeAuctionZone.name}
                  </h3>
                  <p className="text-xs text-gray-400 italic mt-0.5">{activeAuctionZone.terrain}</p>
                </div>

                <div className="p-3.5 bg-gray-950 rounded-2xl border border-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Starting Price:</span>
                    <span className="font-mono font-bold text-gray-200">{activeAuctionZone.starting_price.toLocaleString()} ARK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">In Ground:</span>
                    <span className="text-yellow-400 font-semibold">{activeAuctionZone.in_the_ground || activeAuctionZone.deposits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Yield / MAKES:</span>
                    <span className="text-emerald-400 font-bold">{activeAuctionZone.makes || activeAuctionZone.yield}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Must Build:</span>
                    <span className="text-cyan-300 font-medium truncate max-w-[160px]">{activeAuctionZone.must_build}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedZoneForModal(activeAuctionZone)}
                  className="text-xs text-purple-400 hover:text-purple-300 underline font-semibold"
                >
                  View Complete Official Card →
                </button>
              </div>

              {/* Middle Column: Live Bids Stream */}
              <div className="lg:col-span-4 bg-gray-950 rounded-2xl border border-gray-800 p-4 flex flex-col justify-between space-y-3">
                <div className="pb-3 border-b border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
                      Live Bids Feed ({currentBids.length})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full font-mono">
                      +5,000 ARK Step
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-800">
                      <span className="text-[10px] text-gray-500 block uppercase">CURRENT BID</span>
                      <span className="text-sm font-black text-yellow-400">
                        {(highestBid ? highestBid.amount : activeAuctionZone.starting_price).toLocaleString()} ARK
                      </span>
                    </div>
                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-800">
                      <span className="text-[10px] text-gray-500 block uppercase">NEXT BID</span>
                      <span className="text-sm font-black text-emerald-400">
                        {((highestBid ? highestBid.amount : activeAuctionZone.starting_price) + 5000).toLocaleString()} ARK
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-300">
                    <span className="text-gray-500 font-medium">CURRENT BIDDER: </span>
                    <span className="font-bold text-white">
                      {highestBid ? `${highestBid.team_name} (Team #${highestBid.team_number})` : 'No bids yet (Starting at ' + activeAuctionZone.starting_price.toLocaleString() + ' ARK)'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
                  {currentBids.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No bids received yet.
                    </div>
                  ) : (
                    currentBids.map((bid, idx) => (
                      <div
                        key={bid.id}
                        onClick={() => {
                          setSelectedTeamId(bid.team_id);
                          setFinalAwardPrice(String(bid.amount));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          idx === 0
                            ? 'bg-yellow-950/40 border-yellow-500/70 text-white'
                            : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-[10px] flex items-center justify-center font-bold">
                            #{bid.sequence || currentBids.length - idx}
                          </span>
                          <div>
                            <span className="font-bold block">{bid.team_name}</span>
                            <span className="text-[10px] text-gray-400">Team #{bid.team_number}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-yellow-400 text-sm">
                            {bid.amount.toLocaleString()} ARK
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {highestBid && (
                  <button
                    onClick={() => {
                      setSelectedTeamId(highestBid.team_id);
                      setFinalAwardPrice(String(highestBid.amount));
                    }}
                    className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    Select Lead Bidder ({highestBid.team_name} - {highestBid.amount.toLocaleString()} ARK)
                  </button>
                )}
              </div>

              {/* Right Column: Award Decision Controls */}
              <div className="lg:col-span-4 bg-gray-950 rounded-2xl border border-yellow-500/40 p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wide mb-1">
                    Award Zone Authority
                  </h4>
                  {round1BState.auction_status === 'bidding_stopped' ? (
                    <div className="p-2.5 bg-rose-950/50 border border-rose-600/40 rounded-xl text-xs text-rose-300 font-semibold mb-2">
                      ⏹ Bidding Stopped. Select winning team and click OFFER / AWARD ZONE below.
                    </div>
                  ) : (
                    <div className="p-2.5 bg-yellow-950/40 border border-yellow-600/30 rounded-xl text-xs text-yellow-300 mb-2">
                      ⚡ Bidding is active. Click STOP BIDDING to freeze bids before final award.
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400">
                    Confirm winning team and final price. Deducts balance in real-time and grants zone to winning team.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Winning Team
                    </label>
                    <select
                      id="winning-team-select"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">-- Choose Winning Team --</option>
                      {activeTeams.map((t) => {
                        const w = wallets.find((wal) => wal.team_id === t.id);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.team_name} (#{t.team_number}) — {w?.usable_balance.toLocaleString() || 0} ARK
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-300 uppercase block mb-1">
                      Final Award Price (ARK)
                    </label>
                    <input
                      id="final-award-price-input"
                      type="number"
                      placeholder="e.g. 25000"
                      value={finalAwardPrice}
                      onChange={(e) => setFinalAwardPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                <button
                  id="award-zone-btn"
                  onClick={handlePrepareAward}
                  disabled={!selectedTeamId || !finalAwardPrice}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg ${
                    selectedTeamId && finalAwardPrice
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white cursor-pointer shadow-emerald-600/30'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>🏆</span>
                  <span>OFFER / AWARD ZONE</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ============================================================ */}
        {/* 3. SELECT ZONE & START AUCTION CONTROL (WHEN IDLE)           */}
        {/* ============================================================ */}
        {(!activeAuctionZone || round1BState.auction_status === 'idle' || round1BState.auction_status === 'zone_awarded') && round1BState.active && (
          <div className="bg-gray-900 border border-purple-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Select Zone to Auction
                </h3>
                <p className="text-xs text-gray-400">
                  Only the Admin decides which Zone is active for bidding.
                </p>
              </div>

              {selectedZoneId && (
                <button
                  id="start-auction-btn"
                  onClick={() => handleStartAuction()}
                  className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xs uppercase rounded-xl shadow-lg transition-transform active:scale-95 flex items-center space-x-1.5"
                >
                  <span>⚡</span>
                  <span>
                    START AUCTION FOR {displayZones.find((z) => z.id === selectedZoneId)?.name}
                  </span>
                </button>
              )}
            </div>

            {/* Clickable Available Zones Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {displayZones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const isSold = zone.status === 'sold';
                const ownerTeam = zone.owner_team_id ? teams.find((t) => t.id === zone.owner_team_id) : null;

                return (
                  <div
                    key={zone.id}
                    id={`admin-zone-select-${zone.zone_number}`}
                    onClick={() => {
                      if (!isSold) setSelectedZoneId(zone.id);
                    }}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSold
                        ? 'bg-gray-950/40 border-gray-800 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-purple-600/30 border-purple-500 ring-2 ring-purple-500/50 shadow-lg cursor-pointer'
                        : 'bg-gray-950/80 border-gray-800 hover:border-purple-500/50 hover:bg-gray-900 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-bold text-purple-400">
                          Zone {zone.zone_number}
                        </span>
                        {isSold ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                            Sold
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded">
                            Available
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-xs leading-tight line-clamp-1">
                        {zone.name}
                      </h5>
                      <span className="text-[10px] text-gray-400 block">{zone.region}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-green-400 font-bold">
                        {zone.starting_price.toLocaleString()} ARK
                      </span>
                      {isSold && ownerTeam && (
                        <span className="text-[9px] text-purple-300 font-semibold truncate max-w-[80px]">
                          {ownerTeam.team_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. ALL 20 ZONES OVERVIEW TABLE                               */}
        {/* ============================================================ */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-black text-white">All 20 Zones Master Status</h3>
              <p className="text-xs text-gray-400">Full inventory from the official ARKK Zone Book</p>
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold">
              {displayZones.filter((z) => z.status === 'sold').length} / 20 Awarded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-950 text-gray-400 uppercase font-bold border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Zone Name</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Space / Used</th>
                  <th className="py-2.5 px-3">Free Space</th>
                  <th className="py-2.5 px-3">Starting Price</th>
                  <th className="py-2.5 px-3">Stock (Loads)</th>
                  <th className="py-2.5 px-3">Status / Owner</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayZones.map((zone) => {
                  const isAuctionActive = round1BState.current_auction_zone_id === zone.id && round1BState.auction_open;
                  const isSold = zone.status === 'sold';
                  const ownerTeam = zone.owner_team_id ? teams.find((t) => t.id === zone.owner_team_id) : null;

                  return (
                    <tr key={zone.id} className="hover:bg-gray-850/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-400">{zone.zone_number}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{zone.name}</td>
                      <td className="py-2.5 px-3 text-gray-400">{zone.region}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">{zone.space ?? '-'} / {zone.used ?? '-'}</td>
                      <td className="py-2.5 px-3">
                        {zone.free !== undefined && zone.free < 0 ? (
                          <span className="px-1.5 py-0.5 bg-rose-950 border border-rose-500 text-rose-300 font-bold rounded text-[10px]">
                            {zone.free} OVER CAPACITY
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono font-bold">{zone.free ?? '-'} free</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-green-400 font-bold">{zone.starting_price.toLocaleString()} ARK</td>
                      <td className="py-2.5 px-3 text-yellow-300 font-mono">{zone.stock || zone.in_the_ground?.replace(' — names only. The amount is sealed.', '') || zone.deposits}</td>
                      <td className="py-2.5 px-3">
                        {isAuctionActive ? (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-full font-bold text-[10px] animate-pulse">
                            ⚡ In Auction
                          </span>
                        ) : isSold ? (
                          <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-600/40 rounded-full font-semibold text-[10px]">
                            ✓ {ownerTeam?.team_name || 'Sold'} ({(zone.winning_bid || zone.final_value || 0).toLocaleString()} ARK)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-400 rounded-full text-[10px]">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedZoneForModal(zone)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                        >
                          Details
                        </button>
                        {!isSold && !isAuctionActive && round1BState.active && (
                          <button
                            onClick={() => handleStartAuction(zone.id)}
                            className="text-[11px] px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-300 hover:text-black border border-yellow-500/40 rounded-lg font-bold transition-colors"
                          >
                            Auction
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. PARTICIPATING TEAMS & BALANCES TABLE                       */}
        {/* ============================================================ */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-black text-white">Teams & Bidding Balances</h3>
              <p className="text-xs text-gray-400">
                Real-time financial status across Round 1B
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeTeams.map((team) => {
              const wallet = wallets.find((w) => w.team_id === team.id);
              const ownedZone = zones.find((z) => z.owner_team_id === team.id);

              return (
                <div
                  key={team.id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                    ownedZone
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-gray-950 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{team.team_name}</span>
                    <span className="text-xs text-purple-400 font-semibold">#{team.team_number}</span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Available ARK:</span>
                      <span className="font-mono font-bold text-green-400">
                        {wallet?.usable_balance.toLocaleString() || 0} ARK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Acquired Zone:</span>
                      <span className="font-semibold text-white truncate max-w-[110px]">
                        {ownedZone ? `Zone ${ownedZone.zone_number} (${ownedZone.name})` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* AWARD CONFIRMATION MODAL                                     */}
      {/* ============================================================ */}
      {showConfirmModal && activeAuctionZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 text-yellow-400">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-black text-white">Confirm Zone Award</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to award <strong className="text-white">Zone {activeAuctionZone.zone_number} ({activeAuctionZone.name})</strong> to{' '}
              <strong className="text-white">{teams.find((t) => t.id === selectedTeamId)?.team_name}</strong> for{' '}
              <strong className="text-green-400 font-mono">{parseInt(finalAwardPrice).toLocaleString()} ARK</strong>?
            </p>

            <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 text-xs space-y-1 text-gray-400">
              <p>• {parseInt(finalAwardPrice).toLocaleString()} ARK will be deducted from team&apos;s wallet immediately.</p>
              <p>• Full Zone dossier will be added to the team&apos;s dashboard.</p>
              <p>• Zone {activeAuctionZone.zone_number} will be marked as SOLD.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="confirm-award-modal-btn"
                onClick={handleConfirmAward}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30"
              >
                Confirm & Award
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ZONE DETAILS MODAL (FULL DOSSIER)                            */}
      {/* ============================================================ */}
      {selectedZoneForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold block">
                  ZONE {selectedZoneForModal.zone_number} • {selectedZoneForModal.region}
                </span>
                <h3 className="text-2xl font-black text-white">{selectedZoneForModal.name}</h3>
              </div>
              <button
                onClick={() => setSelectedZoneForModal(null)}
                className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 flex justify-between">
                <span className="text-gray-400 uppercase">Starting Price:</span>
                <span className="font-mono font-bold text-green-400 text-sm">
                  {selectedZoneForModal.starting_price.toLocaleString()} ARK
                </span>
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase block">Next To:</span>
                <p className="text-gray-200">{selectedZoneForModal.next_to || selectedZoneForModal.neighboring_zones}</p>
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase block">Terrain:</span>
                <p className="text-gray-200">{selectedZoneForModal.terrain}</p>
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-yellow-400 font-bold uppercase block">In the Ground:</span>
                <p className="text-white">{selectedZoneForModal.in_the_ground || selectedZoneForModal.deposits}</p>
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold uppercase block">MAKES:</span>
                <p className="text-white font-mono">{selectedZoneForModal.makes || selectedZoneForModal.yield}</p>
              </div>
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/40 rounded-xl space-y-1">
                <span className="text-cyan-400 font-bold uppercase block">MUST BUILD:</span>
                <p className="text-gray-200">{selectedZoneForModal.must_build}</p>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-1">
                <span className="text-rose-400 font-bold uppercase block">GOES WRONG:</span>
                <p className="text-gray-300">{selectedZoneForModal.goes_wrong || selectedZoneForModal.problem}</p>
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <span className="text-purple-400 font-bold uppercase block">HAS AND NEEDS:</span>
                <p className="text-gray-300">{selectedZoneForModal.has_and_needs}</p>
              </div>
              {selectedZoneForModal.note && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1">
                  <span className="text-amber-400 font-bold uppercase block">Chief Judge Note:</span>
                  <p className="text-amber-200">{selectedZoneForModal.note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedZoneForModal(null)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* END ROUND 1B CONFIRMATION MODAL                              */}
      {/* ============================================================ */}
      {showEndRoundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-rose-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <span className="text-3xl">⏹</span>
              <div>
                <h3 className="text-xl font-black text-white">End Round 1B?</h3>
                <span className="text-xs text-rose-400 font-semibold">Zone Auction Completion</span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              Are you sure you want to end Round 1B? This will close any active zone auctions and route participants back to their dashboard. All purchased zones, team balances, and unlocked funds will be preserved.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowEndRoundModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-end-round1b-btn"
                onClick={handleEndRound}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/40 transition-colors"
              >
                Confirm & End Round 1B
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
