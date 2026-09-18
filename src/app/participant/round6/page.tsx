'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isParticipant } from '@/lib/auth';

export default function ParticipantRound6Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const zones = useStore((state) => state.zones);
  const wallets = useStore((state) => state.wallets);
  const scores = useStore((state) => state.scores);
  const transactions = useStore((state) => state.transactions);
  const purchases = useStore((state) => state.purchases);
  const proposals = useStore((state) => state.proposals);
  const videos = useStore((state) => state.videos);
  const deals = useStore((state) => state.deals);
  const round6State = useStore((state) => state.round6State);
  const eventState = useStore((state) => state.eventState);
  
  useEffect(() => {
    if (!currentUser || !isParticipant(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isParticipant(currentUser)) {
    return null;
  }
  
  const team = teams.find((t) => t.id === currentUser.team_id);
  const ownedZone = zones.find((z) => z.owner_team_id === currentUser.team_id);
  const wallet = wallets.find((w) => w.team_id === currentUser.team_id);
  const teamScores = scores.filter((s) => s.team_id === currentUser.team_id);
  const teamTransactions = transactions.filter((t) => t.team_id === currentUser.team_id);
  const teamPurchases = purchases.filter((p) => p.team_id === currentUser.team_id);
  const teamProposal = proposals.find((p) => p.team_id === currentUser.team_id);
  const teamVideo = videos.find((v) => v.team_id === currentUser.team_id);
  const teamDeals = deals.filter((d) => d.seller_team === currentUser.team_id || d.buyer_team === currentUser.team_id);
  
  const totalScore = teamScores.reduce((sum, s) => sum + s.marks, 0);
  const totalSpent = teamTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const remainingBalance = wallet?.usable_balance || 0;
  
  const getRoundScore = (round: number) => {
    return teamScores.filter((s) => s.round === round).reduce((sum, s) => sum + s.marks, 0);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 6 - Board Meeting & Audit</span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">{team?.team_name}</p>
              <p className="text-xs text-gray-500">Team {team?.team_number}</p>
            </div>
            <button
              onClick={() => router.push('/participant/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      
      <main className="p-6">
        {/* Round Status */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Round Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              round6State.active ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {round6State.active ? 'Active' : 'Not Started'}
            </span>
          </div>
          <p className="text-gray-400">{eventState.current_activity}</p>
        </div>
        
        {/* Complete Journey Summary */}
        {round6State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">ARKK Board Report - Complete Journey</h2>
            
            <div className="space-y-6">
              {/* Team Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Team</p>
                  <p className="font-bold">{team?.team_name}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Zone</p>
                  <p className="font-semibold">{ownedZone?.name || 'None'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total Score</p>
                  <p className="text-2xl font-bold text-green-400">{totalScore}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Remaining ARK</p>
                  <p className="text-xl font-bold">{remainingBalance.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Financial History */}
              <div>
                <h3 className="font-bold mb-3">Financial History</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Starting ARK</p>
                    <p className="font-semibold">2,50,000 ARK</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Total Spent</p>
                    <p className="font-semibold text-red-400">{totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Transactions</p>
                    <p className="font-semibold">{teamTransactions.length}</p>
                  </div>
                </div>
              </div>
              
              {/* Round Scores */}
              <div>
                <h3 className="font-bold mb-3">Round Scores</h3>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((round) => (
                    <div key={round} className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs">Round {round}</p>
                      <p className="font-bold">{getRoundScore(round)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Zone Information */}
              {ownedZone && (
                <div>
                  <h3 className="font-bold mb-3">Zone Information</h3>
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span>{ownedZone.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Region:</span>
                      <span>{ownedZone.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Purchase Price:</span>
                      <span className="text-green-400">{ownedZone.starting_price.toLocaleString()} ARK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Problem:</span>
                      <span className="text-red-400">{ownedZone.problem}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Round 2 Proposal */}
              <div>
                <h3 className="font-bold mb-3">Round 2 Proposal</h3>
                {teamProposal ? (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <p className="text-green-400 font-semibold mb-2">Submitted</p>
                    <p className="text-xs text-gray-400 mb-2">
                      {teamProposal.submitted_at ? new Date(teamProposal.submitted_at).toLocaleString() : 'N/A'}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Problem:</span> {teamProposal.problem}</div>
                      <div><span className="text-gray-400">Shortage:</span> {teamProposal.shortage}</div>
                      <div><span className="text-gray-400">Purchases:</span> {teamProposal.purchases}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <p className="text-red-400 font-semibold">Not Submitted</p>
                  </div>
                )}
              </div>
              
              {/* Round 3 Video */}
              <div>
                <h3 className="font-bold mb-3">Round 3 Promotion Video</h3>
                {teamVideo ? (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <p className="text-green-400 font-semibold">Submitted ({teamVideo.status})</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {teamVideo.uploaded_at ? new Date(teamVideo.uploaded_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <p className="text-red-400 font-semibold">Not Submitted</p>
                  </div>
                )}
              </div>
              
              {/* Round 5 Deals */}
              <div>
                <h3 className="font-bold mb-3">Round 5 Negotiations ({teamDeals.length})</h3>
                {teamDeals.length > 0 ? (
                  <div className="space-y-2">
                    {teamDeals.map((deal) => (
                      <div key={deal.id} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="font-semibold">{deal.resource} x {deal.quantity}</span>
                          <span className="text-green-400">{deal.price.toLocaleString()} ARK</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Status: {deal.status}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No deals completed</p>
                )}
              </div>
              
              {/* Recent Transactions */}
              <div>
                <h3 className="font-bold mb-3">Recent Transactions</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {teamTransactions.slice(-5).reverse().map((txn) => (
                    <div key={txn.id} className="bg-gray-700/50 rounded-lg p-2 text-sm">
                      <div className="flex justify-between">
                        <span>{txn.description}</span>
                        <span className={txn.amount < 0 ? 'text-red-400' : 'text-green-400'}>
                          {txn.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(txn.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        {round6State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Board Meeting Instructions</h2>
            <div className="space-y-3 text-gray-300">
              <p>• Present your complete journey to the ARKK Board.</p>
              <p>• Defend your decisions and strategy throughout all rounds.</p>
              <p>• Explain your zone choice, purchases, and proposal.</p>
              <p>• Highlight your achievements and address any mistakes.</p>
              <p>• The Board will evaluate your overall performance and final score.</p>
              <p>• Wait for the Admin to call your team for the board meeting.</p>
            </div>
          </div>
        )}
        
        {/* Round Not Started */}
        {!round6State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Round 6 has not started yet</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the final round</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
