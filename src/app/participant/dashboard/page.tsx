'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, syncRound1AWithServer, syncRound1BWithServer } from '@/lib/store';
import { isParticipant, getSavedSession, clearSession } from '@/lib/auth';
import { officialZones } from '@/lib/zones';

export default function ParticipantDashboardPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const eventState = useStore((state) => state.eventState);
  const scores = useStore((state) => state.scores);
  const zones = useStore((state) => state.zones);
  const round1AState = useStore((state) => state.round1AState);
  const round1BState = useStore((state) => state.round1BState);
  const round1AStatus = round1AState?.status || (round1AState?.active ? (round1AState?.current_question_id ? 'QUESTION_DISPLAYED' : 'ROUND_STARTED_WAITING') : 'ROUND_NOT_STARTED');

  const isQuestionPhase =
    round1AStatus === 'PREPARATION_30_SEC' ||
    round1AStatus === 'BIDDING_OPEN_60_SEC' ||
    round1AStatus === 'BIDDING_CLOSED' ||
    round1AStatus === 'ADMIN_AWARDS_QUESTION' ||
    round1AStatus === 'ADMIN_MARKS_CORRECT_OR_WRONG' ||
    round1AStatus === 'WAIT_FOR_ADMIN_NEXT_QUESTION' ||
    round1AStatus === 'QUESTION_DISPLAYED' ||
    round1AStatus === 'ANSWERING_ACTIVE' ||
    round1AStatus === 'ANSWER_SUBMITTED' ||
    round1AStatus === 'WAITING_FOR_ADMIN_DECISION' ||
    round1AStatus === 'ANSWER_CORRECT' ||
    round1AStatus === 'ANSWER_WRONG' ||
    round1AStatus === 'TIMES_UP';

  const isRound1AActive =
    round1AState?.active && round1AStatus !== 'ROUND_ENDED' && round1AStatus !== 'ROUND_NOT_STARTED' ||
    round1AStatus === 'ROUND_STARTED_WAITING' ||
    round1AStatus === 'WAITING_FOR_QUESTION' ||
    round1AStatus === 'NEXT_QUESTION' ||
    isQuestionPhase;

  useEffect(() => {
    syncRound1AWithServer();
    syncRound1BWithServer();
    const interval = setInterval(() => {
      syncRound1AWithServer();
      syncRound1BWithServer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
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
      return;
    }

    if (isRound1AActive) {
      router.push('/participant/round1a');
      return;
    }

    if (round1BState.active) {
      router.push('/participant/round1b');
      return;
    }
  }, [currentUser, round1AStatus, round1BState.active, router]);
  
  const activeUser = currentUser || getSavedSession('participant');
  if (!activeUser || !isParticipant(activeUser)) {
    return null;
  }
  
  const team = teams.find((t) => t.id === activeUser.team_id);
  const wallet = wallets.find((w) => w.team_id === activeUser.team_id);
  const teamScores = scores.filter((s) => s.team_id === activeUser.team_id);
  const round1AScore = scores
    .filter((s) => s.team_id === activeUser.team_id && (s.category === 'Round 1A' || (!s.category?.includes('1B') && s.round === 1)))
    .reduce((sum, s) => sum + s.marks, 0);
  const round1BScore = scores
    .filter((s) => s.team_id === activeUser.team_id && s.category === 'Round 1B')
    .reduce((sum, s) => sum + s.marks, 0);
  const participantTotalScore = round1AScore + round1BScore;

  const rawOwnedZone = zones.find((z) => z.owner_team_id === activeUser.team_id);
  const ownedZone = rawOwnedZone
    ? {
        ...(officialZones.find((oz) => oz.id === rawOwnedZone.id) || {}),
        ...rawOwnedZone,
      }
    : null;
  
  const isRound1BEnded = !round1BState.active && (ownedZone !== null || eventState.current_round >= 2 || eventState.current_activity?.includes('Round 1B Completed'));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Best Management Team 2040</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">{team?.team_name}</p>
              <p className="text-xs text-gray-500">Team {team?.team_number}</p>
            </div>
            <div className="px-3 py-1 bg-blue-600 rounded-full text-sm font-semibold">
              {eventState.current_round === 0
                ? 'No Active Round'
                : round1BState.active
                ? 'Round 1B'
                : isRound1BEnded
                ? 'Round 1B'
                : 'Round 1A'}
            </div>
            <button
              onClick={() => {
                clearSession('participant');
                useStore.getState().setCurrentUser(null);
                router.push('/login');
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        {/* Status Banner */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 font-semibold">
                {eventState.current_round === 0
                  ? 'NO ACTIVE ROUND'
                  : round1BState.active
                  ? 'Round 1B — Live Zone Auction Active'
                  : isRound1BEnded
                  ? 'Round 1B Completed'
                  : round1AStatus === 'ROUND_ENDED'
                  ? 'Round 1A Completed — Standby for Round 1B'
                  : isRound1AActive
                  ? 'Round 1A — Quiz Active'
                  : 'NO ACTIVE ROUND'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {eventState.current_round === 0
                  ? 'NO ACTIVE ROUND — Standby for host to begin'
                  : round1BState.active
                  ? 'Live Zone Bidding in progress'
                  : isRound1BEnded
                  ? 'Zone Auction concluded. Follow host instructions.'
                  : round1AStatus === 'ROUND_ENDED'
                  ? 'Standby for Admin to launch Round 1B'
                  : 'Waiting for event to start'}
              </p>
            </div>
            {eventState.timer_running && (
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{eventState.timer_remaining}s</p>
                <p className="text-gray-400 text-sm">Remaining</p>
              </div>
            )}
          </div>
        </div>

        {/* Round 1A Completed Official Banner */}
        {round1AStatus === 'ROUND_ENDED' && !round1BState.active && !isRound1BEnded && (
          <div className="bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-gray-900 border-2 border-emerald-500/60 rounded-2xl p-5 mb-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                🏁
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-emerald-300 font-black text-lg tracking-tight">Round 1A Completed!</h4>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold rounded-full">
                    Official
                  </span>
                </div>
                <p className="text-gray-300 text-xs mt-1">
                  Round 1A answering session is officially finished. Your score and wallet deductions have been recorded.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end md:self-center">
              <div className="px-4 py-2 bg-gray-900/90 border border-blue-500/40 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Round 1A Points</span>
                <span className="text-lg font-mono font-black text-blue-400">{round1AScore} pts</span>
              </div>
              <div className="px-4 py-2 bg-gray-900/90 border border-green-500/40 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Usable ARK</span>
                <span className="text-lg font-mono font-black text-green-400">{wallet?.usable_balance.toLocaleString() || 0} ARK</span>
              </div>
            </div>
          </div>
        )}

        {/* Round 1B Completed Official Banner */}
        {isRound1BEnded && (
          <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-gray-900 border-2 border-purple-500/60 rounded-2xl p-5 mb-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl flex-shrink-0">
                🏆
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-purple-300 font-black text-lg tracking-tight">Round 1B Completed!</h4>
                  <span className="px-2.5 py-0.5 bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold rounded-full">
                    Official
                  </span>
                </div>
                <p className="text-gray-300 text-xs mt-1">
                  {ownedZone
                    ? `You successfully acquired Zone ${ownedZone.zone_number}: ${ownedZone.name}. Review your economic dossier below.`
                    : 'Zone Auction is concluded. Follow host instructions.'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 self-end md:self-center">
              <div className="px-4 py-2 bg-gray-900/90 border border-purple-500/40 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Round 1B Points</span>
                <span className="text-lg font-mono font-black text-purple-400">{round1BScore} pts</span>
              </div>
              <div className="px-4 py-2 bg-gray-900/90 border border-green-500/40 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Usable ARK</span>
                <span className="text-lg font-mono font-black text-green-400">{wallet?.usable_balance.toLocaleString() || 0} ARK</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Financial Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Usable ARK Balance</h3>
            <p className="text-4xl font-bold text-green-400">{wallet?.usable_balance.toLocaleString()} ARK</p>
            <p className="text-gray-500 text-sm mt-1">Available ARK</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Frozen ARK</h3>
            <p className="text-4xl font-bold text-yellow-400">{wallet?.frozen_balance.toLocaleString()} ARK</p>
            <p className="text-gray-500 text-sm mt-1">Reserved Balance</p>
          </div>
        </div>
        
        {/* Score Panel — Only Round 1A and Round 1B visible to participants */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6 shadow-xl">
          <h3 className="text-lg font-bold mb-4">Your Score</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-900/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-xs mb-1 uppercase font-bold tracking-wider">Total Score</p>
              <p className="text-3xl font-black text-white">{participantTotalScore}</p>
            </div>
            <div className="p-4 bg-gray-900/80 rounded-xl border border-blue-500/40">
              <p className="text-blue-400 text-xs mb-1 uppercase font-bold tracking-wider">Round 1A (Quiz)</p>
              <p className="text-3xl font-mono font-black text-blue-400">{round1AScore} pts</p>
            </div>
            <div className="p-4 bg-gray-900/80 rounded-xl border border-purple-500/40">
              <p className="text-purple-400 text-xs mb-1 uppercase font-bold tracking-wider">Round 1B (Auction)</p>
              <p className="text-3xl font-mono font-black text-purple-400">{round1BScore} pts</p>
            </div>
          </div>
        </div>
        
        {/* Zone Panel — MY ACQUIRED ZONE */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <h3 className="text-xl font-black text-white tracking-tight">MY ACQUIRED ZONE</h3>
            </div>
            {ownedZone && (
              <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-xs rounded-full">
                ✓ Acquired in Round 1B
              </span>
            )}
          </div>

          {ownedZone ? (
            <div className="space-y-6 text-xs md:text-sm">
              {/* Zone Identity Banner */}
              <div className="p-4 bg-gray-900 rounded-2xl border border-gray-700/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-purple-400 font-mono font-black tracking-wider block">
                    ZONE {String(ownedZone.zone_number).padStart(2, '0')} • {ownedZone.region}
                  </span>
                  <span className="text-2xl md:text-3xl font-black text-white">{ownedZone.name}</span>
                  {ownedZone.terrain && (
                    <p className="text-xs text-gray-400 italic mt-0.5">{ownedZone.terrain}</p>
                  )}
                </div>
                {ownedZone.tier && (
                  <span className="px-3 py-1 bg-blue-900/40 border border-blue-600 text-blue-300 text-xs font-bold rounded-xl">
                    Tier: {ownedZone.tier}
                  </span>
                )}
              </div>

              {/* Four Distinct Economic Metrics Required by Single Source of Truth */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Zone Economic Valuation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-gray-900 rounded-xl border border-green-500/40 shadow-inner">
                    <span className="text-gray-400 block text-[11px] font-bold uppercase">ZONE PURCHASE PRICE</span>
                    <span className="text-xl font-mono font-black text-green-400 block mt-1">
                      {(ownedZone.purchase_price || ownedZone.winning_bid || ownedZone.final_value || 0).toLocaleString()} ARK
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Amount paid in auction</span>
                  </div>

                  <div className="p-3.5 bg-gray-900 rounded-xl border border-purple-500/40 shadow-inner">
                    <span className="text-gray-400 block text-[11px] font-bold uppercase">ZONE TOTAL VALUE</span>
                    <span className="text-xl font-mono font-black text-purple-300 block mt-1">
                      {(ownedZone.zone_total_value || ownedZone.final_value || 0).toLocaleString()} ARK
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Zone Book total value</span>
                  </div>

                  <div className="p-3.5 bg-gray-900 rounded-xl border border-yellow-500/40 shadow-inner">
                    <span className="text-gray-400 block text-[11px] font-bold uppercase">TOTAL RAW MATERIAL VALUE</span>
                    <span className="text-xl font-mono font-black text-yellow-400 block mt-1">
                      {(ownedZone.total_raw_material_value || 0).toLocaleString()} ARK
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Per-cycle raw yield value</span>
                  </div>

                  <div className="p-3.5 bg-gray-900 rounded-xl border border-cyan-500/40 shadow-inner">
                    <span className="text-gray-400 block text-[11px] font-bold uppercase">GENERATION / OUTPUT VALUE</span>
                    <span className="text-sm font-mono font-bold text-cyan-300 block mt-1 leading-snug">
                      {ownedZone.generation_output_value || ownedZone.makes || ownedZone.yield || 'N/A'}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Cycle output capacity</span>
                  </div>
                </div>
              </div>

              {/* Raw Materials Breakdown Table */}
              {ownedZone.raw_materials && ownedZone.raw_materials.length > 0 && (
                <div className="p-4 bg-gray-900 rounded-2xl border border-gray-700/80 space-y-3">
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
                      <thead className="bg-gray-950 text-gray-400 uppercase font-bold border-b border-gray-800">
                        <tr>
                          <th className="py-2.5 px-3">Raw Material Name</th>
                          <th className="py-2.5 px-3">Quantity</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total Material Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 font-mono">
                        {ownedZone.raw_materials.map((rm, idx) => (
                          <tr key={idx} className="hover:bg-gray-850">
                            <td className="py-2 px-3 text-white font-semibold font-sans">{rm.name}</td>
                            <td className="py-2 px-3 text-yellow-300 font-bold">{rm.quantity}</td>
                            <td className="py-2 px-3 text-gray-400 font-sans">{rm.unit}</td>
                            <td className="py-2 px-3 text-gray-300">{rm.price.toLocaleString()} ARK</td>
                            <td className="py-2 px-3 text-right text-emerald-400 font-bold">{rm.total_value.toLocaleString()} ARK</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-700 bg-gray-950 font-bold">
                        <tr>
                          <td colSpan={4} className="py-2.5 px-3 text-gray-300 uppercase tracking-wider">
                            TOTAL RAW MATERIAL VALUE
                          </td>
                          <td className="py-2.5 px-3 text-right text-yellow-400 font-mono text-sm">
                            {(ownedZone.total_raw_material_value || 0).toLocaleString()} ARK
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Complete Zone Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Stock:</span>
                  <span className="text-yellow-400 font-bold">{ownedZone.stock || ownedZone.deposits || 'N/A'}</span>
                </div>
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Space & Used:</span>
                  <span className="text-gray-200 font-mono">Space: {ownedZone.space ?? '-'} · Used: {ownedZone.used ?? '-'}</span>
                </div>
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Free Capacity:</span>
                  {ownedZone.free !== undefined && ownedZone.free < 0 ? (
                    <span className="px-2 py-0.5 bg-rose-950 border border-rose-500 text-rose-300 font-black rounded text-xs animate-pulse inline-block">
                      {ownedZone.free} OVER CAPACITY
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold font-mono">{ownedZone.free ?? '-'} Free</span>
                  )}
                </div>
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Borders (Next to):</span>
                  <span className="text-gray-200 font-semibold">{ownedZone.next_to || ownedZone.neighboring_zones}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Settlement Description:</span>
                  <span className="text-gray-300 text-xs">{ownedZone.description || ownedZone.terrain}</span>
                </div>
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/80">
                  <span className="text-gray-400 block text-xs font-semibold uppercase mb-0.5">Worth Evaluation:</span>
                  <span className="text-emerald-300 font-mono font-bold text-xs">
                    {ownedZone.zone_total_value ? `${ownedZone.zone_total_value.toLocaleString()} ARK (${ownedZone.worth_per_arc ? `${ownedZone.worth_per_arc} per ARK` : 'Revealed'})` : 'SEALED'}
                  </span>
                </div>
              </div>



              {/* Strategic Dossier Details: Strengths, Weaknesses, Advantages, Risks, Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ownedZone.advantages && (
                  <div className="p-3 bg-emerald-950/15 border border-emerald-500/30 rounded-xl">
                    <span className="text-emerald-400 block text-xs font-bold uppercase mb-0.5">Advantages:</span>
                    <span className="text-gray-300 text-xs">{ownedZone.advantages}</span>
                  </div>
                )}
                {ownedZone.risks && (
                  <div className="p-3 bg-rose-950/15 border border-rose-500/30 rounded-xl">
                    <span className="text-rose-400 block text-xs font-bold uppercase mb-0.5">Risks:</span>
                    <span className="text-gray-300 text-xs">{ownedZone.risks}</span>
                  </div>
                )}
                {ownedZone.opportunities && (
                  <div className="p-3 bg-blue-950/15 border border-blue-500/30 rounded-xl">
                    <span className="text-blue-400 block text-xs font-bold uppercase mb-0.5">Opportunities:</span>
                    <span className="text-gray-300 text-xs">{ownedZone.opportunities}</span>
                  </div>
                )}
              </div>

              {ownedZone.note && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                  <span className="text-amber-400 block text-xs font-bold uppercase mb-0.5">Zone Dossier Notes:</span>
                  <span className="text-amber-200 text-xs leading-relaxed">{ownedZone.note}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => router.push('/participant/round1b')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  View in Round 1B Arena →
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg font-bold">Zone Not Acquired Yet</p>
              <p className="text-gray-500 text-sm mt-1">
                {round1BState.active
                  ? 'Round 1B is currently active! Enter the Zone Auction Arena to bid on a Zone.'
                  : 'Wait for the Admin to begin Round 1B Zone Auction.'}
              </p>
              {round1BState.active && (
                <button
                  onClick={() => router.push('/participant/round1b')}
                  className="mt-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30"
                >
                  Enter Round 1B Zone Auction →
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Current Round Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4">Current Activity</h3>
          {eventState.current_round === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg font-bold uppercase tracking-wider">NO ACTIVE ROUND</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the event</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-semibold">
                    {round1BState.active
                      ? 'Round 1B'
                      : isRound1BEnded
                      ? 'Round 1B Completed'
                      : round1AStatus === 'ROUND_ENDED'
                      ? 'Round 1A Completed'
                      : 'Round 1A'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {round1BState.active
                      ? 'Live Zone Auction in progress'
                      : isRound1BEnded
                      ? 'Zone Auction concluded — Standby for host instructions'
                      : round1AStatus === 'ROUND_ENDED'
                      ? 'Round 1A Completed — Standby for Admin to begin Round 1B'
                      : isRound1AActive
                      ? 'Round 1A Quiz is currently active'
                      : 'Standby for round to start'}
                  </p>
                </div>
                <div className="text-right">
                  {isRound1BEnded ? (
                    <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-full text-sm font-semibold">
                      Completed
                    </span>
                  ) : round1BState.active ? (
                    <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-semibold animate-pulse">
                      Active Now
                    </span>
                  ) : round1AStatus === 'ROUND_ENDED' ? (
                    <span className="px-3 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-full text-sm font-semibold">
                      Round 1A Completed
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
                      Active
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {round1AStatus === 'ROUND_ENDED' ? (
                  <div className="p-4 bg-gray-900/80 border border-gray-700/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Round 1A Finished</p>
                        <p className="text-xs text-gray-400">
                          Score Recorded: <strong className="text-blue-400">{round1AScore} pts</strong> • Usable ARK: <strong className="text-green-400">{wallet?.usable_balance.toLocaleString() || 0} ARK</strong>
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-full">
                      Completed
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push('/participant/round1a')}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Go to Round 1A</span>
                    <span className="text-xs bg-blue-800 px-2 py-0.5 rounded-full">Current</span>
                  </button>
                )}

                {round1BState.active ? (
                  <button
                    onClick={() => router.push('/participant/round1b')}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30"
                  >
                    <span>Enter Round 1B (Zone Auction) →</span>
                    <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded-full animate-pulse">
                      Active Now
                    </span>
                  </button>
                ) : isRound1BEnded ? (
                  <div className="p-4 bg-gray-900/80 border border-purple-800/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
                        🏆
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Round 1B (Zone Auction) Finished</p>
                        <p className="text-xs text-gray-400">
                          {ownedZone ? `Acquired: Zone ${ownedZone.zone_number} — ${ownedZone.name}` : 'Zone Auction has officially ended.'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold rounded-full">
                      Concluded
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl text-center">
                    <p className="text-purple-300 font-semibold text-xs">Next: Round 1B (Zone Auction)</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {round1AStatus === 'ROUND_ENDED'
                        ? 'Waiting for Admin to launch Round 1B Zone Auction… It will unlock automatically.'
                        : 'Round 1B will unlock after Round 1A is completed.'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-center py-4 border-t border-gray-700/50">
                <p className="text-gray-400 text-xs">Follow the live instructions displayed by the Host / Admin.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
