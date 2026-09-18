'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import AdminRoundScoringPanel from '@/components/AdminRoundScoringPanel';

export default function AdminRound6Page() {
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
  
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [juryScore, setJuryScore] = useState('');
  
  const updateRound6State = useStore((state) => state.updateRound6State);
  const updateEventState = useStore((state) => state.updateEventState);
  const addScore = useStore((state) => state.addScore);
  const updateScore = useStore((state) => state.updateScore);
  const addAuditLog = useStore((state) => state.addAuditLog);
  
  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isAdmin(currentUser)) {
    return null;
  }
  
  const finalTeams = teams.filter((t) => t.active && !t.eliminated);
  
  const handleStartRound = () => {
    updateEventState({ current_round: 6, current_activity: 'Round 6 - Board Meeting & Audit', event_status: 'in_progress' });
    updateRound6State({ active: true, scoring_open: true });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_ROUND_6',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRound = () => {
    updateEventState({ current_round: 0, current_activity: 'Event Completed', event_status: 'completed' });
    updateRound6State({ active: false, scoring_open: false });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_ROUND_6',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleSubmitJuryScore = () => {
    if (!selectedTeamId || !juryScore) return;
    
    const score = parseInt(juryScore) || 0;
    
    // Remove existing Round 6 scores for this team
    const existingScores = scores.filter((s) => s.team_id === selectedTeamId && s.round === 6);
    existingScores.forEach((s) => {
      updateScore(s.id, { marks: 0 });
    });
    
    // Add new score
    addScore({
      id: `score_${Date.now()}`,
      team_id: selectedTeamId,
      round: 6,
      category: 'Board Meeting',
      marks: score,
    });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      team_id: selectedTeamId,
      action: 'SUBMIT_ROUND_6_SCORE',
      new_value: score.toString(),
      timestamp: new Date().toISOString(),
    });
    
    setSelectedTeamId('');
    setJuryScore('');
  };
  
  const getTeamCompleteHistory = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    const zone = zones.find((z) => z.owner_team_id === teamId);
    const wallet = wallets.find((w) => w.team_id === teamId);
    const teamScores = scores.filter((s) => s.team_id === teamId);
    const teamTransactions = transactions.filter((t) => t.team_id === teamId);
    const teamPurchases = purchases.filter((p) => p.team_id === teamId);
    const teamProposal = proposals.find((p) => p.team_id === teamId);
    const teamVideo = videos.find((v) => v.team_id === teamId);
    const teamDeals = deals.filter((d) => d.seller_team === teamId || d.buyer_team === teamId);
    
    const totalScore = teamScores.reduce((sum, s) => sum + s.marks, 0);
    const totalSpent = teamTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remainingBalance = wallet?.usable_balance || 0;
    
    return {
      team,
      zone,
      wallet,
      totalScore,
      totalSpent,
      remainingBalance,
      teamScores,
      teamTransactions,
      teamPurchases,
      teamProposal,
      teamVideo,
      teamDeals,
    };
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
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </header>
      
      <main className="p-6">
        {/* Round Control */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-bold mb-4">Round Control</h2>
          
          {!round6State.active ? (
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start Round 6
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-green-600 rounded-full text-sm">Round Active</span>
                <span className="text-gray-400">{eventState.current_activity}</span>
              </div>
              
              <button
                onClick={handleEndRound}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                End Round 6 & Complete Event
              </button>
            </div>
          )}
        </div>

        {/* Round 6 Team Scoring Panel */}
        <AdminRoundScoringPanel
          round={6}
          roundTitle="Round 6 — Board Meeting & Audit Scoring"
          description="Enter points for each team in Round 6. Changes immediately reflect in the participant dashboard score panel."
        />
        
        {/* Final Teams Overview */}
        {round6State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Final Teams</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {finalTeams.map((team) => {
                const history = getTeamCompleteHistory(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedTeamId === team.id
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{team.team_name}</span>
                      <span className="text-green-400 font-bold">{history.totalScore}</span>
                    </div>
                    <p className="text-sm text-gray-400">Zone: {history.zone?.name || 'None'}</p>
                    <p className="text-sm text-gray-400">Balance: {history.remainingBalance.toLocaleString()}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Team Complete History */}
        {round6State.active && selectedTeamId && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Complete Team History</h2>
            
            {(() => {
              const history = getTeamCompleteHistory(selectedTeamId);
              
              return (
                <div className="space-y-6">
                  {/* Team Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Team</p>
                      <p className="font-bold">{history.team?.team_name}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Zone</p>
                      <p className="font-semibold">{history.zone?.name || 'None'}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Total Score</p>
                      <p className="text-2xl font-bold text-green-400">{history.totalScore}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Remaining ARK</p>
                      <p className="text-xl font-bold">{history.remainingBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Financial History */}
                  <div>
                    <h3 className="font-bold mb-3">Financial History</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Starting ARK</p>
                        <p className="font-semibold">2,50,000 ARK</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <p className="text-gray-400 text-sm">Total Spent</p>
                        <p className="font-semibold text-red-400">{history.totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Round Scores */}
                  <div>
                    <h3 className="font-bold mb-3">Round Scores</h3>
                    <div className="grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((round) => {
                        const roundScore = history.teamScores
                          .filter((s) => s.round === round)
                          .reduce((sum, s) => sum + s.marks, 0);
                        return (
                          <div key={round} className="bg-gray-700/50 rounded-lg p-3 text-center">
                            <p className="text-gray-400 text-xs">Round {round}</p>
                            <p className="font-bold">{roundScore}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Transactions Summary */}
                  <div>
                    <h3 className="font-bold mb-3">Transactions ({history.teamTransactions.length})</h3>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {history.teamTransactions.slice(0, 5).map((txn) => (
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
                  
                  {/* Proposal Status */}
                  <div>
                    <h3 className="font-bold mb-3">Round 2 Proposal</h3>
                    {history.teamProposal ? (
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                        <p className="text-green-400 font-semibold">Submitted</p>
                        <p className="text-xs text-gray-400">
                          {history.teamProposal.submitted_at ? new Date(history.teamProposal.submitted_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                        <p className="text-red-400 font-semibold">Not Submitted</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Video Status */}
                  <div>
                    <h3 className="font-bold mb-3">Round 3 Video</h3>
                    {history.teamVideo ? (
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                        <p className="text-green-400 font-semibold">Submitted ({history.teamVideo.status})</p>
                      </div>
                    ) : (
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                        <p className="text-red-400 font-semibold">Not Submitted</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Deals */}
                  <div>
                    <h3 className="font-bold mb-3">Round 5 Deals ({history.teamDeals.length})</h3>
                    {history.teamDeals.length > 0 ? (
                      <div className="space-y-2">
                        {history.teamDeals.slice(0, 3).map((deal) => (
                          <div key={deal.id} className="bg-gray-700/50 rounded-lg p-2 text-sm">
                            <p>{deal.resource} x {deal.quantity} - {deal.price.toLocaleString()} ARK</p>
                            <p className="text-xs text-gray-400">Status: {deal.status}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No deals</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Jury Scoring */}
        {round6State.active && round6State.scoring_open && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Jury Scoring</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a team</option>
                  {finalTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Board Meeting Score (0-200)</label>
                <input
                  type="number"
                  value={juryScore}
                  onChange={(e) => setJuryScore(e.target.value)}
                  min="0"
                  max="200"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter score"
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmitJuryScore}
              disabled={!selectedTeamId || !juryScore}
              className="mt-4 w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              Submit Jury Score
            </button>
          </div>
        )}
        
        {/* Final Leaderboard */}
        {round6State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Final Leaderboard</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">Rank</th>
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Zone</th>
                    <th className="pb-3">Round 1</th>
                    <th className="pb-3">Round 2</th>
                    <th className="pb-3">Round 3</th>
                    <th className="pb-3">Round 4</th>
                    <th className="pb-3">Round 5</th>
                    <th className="pb-3">Round 6</th>
                    <th className="pb-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {finalTeams
                    .map((team) => {
                      const history = getTeamCompleteHistory(team.id);
                      const roundScores = [1, 2, 3, 4, 5, 6].map((round) =>
                        history.teamScores
                          .filter((s) => s.round === round)
                          .reduce((sum, s) => sum + s.marks, 0)
                      );
                      
                      return { team, history, roundScores };
                    })
                    .sort((a, b) => b.history.totalScore - a.history.totalScore)
                    .map((item, index) => (
                      <tr key={item.team.id} className="border-b border-gray-700/50">
                        <td className="py-3 font-bold">{index + 1}</td>
                        <td className="py-3">{item.team.team_name}</td>
                        <td className="py-3 text-gray-400">{item.history.zone?.name || 'None'}</td>
                        {item.roundScores.map((score, i) => (
                          <td key={i} className="py-3">{score}</td>
                        ))}
                        <td className="py-3 font-bold text-green-400">{item.history.totalScore}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
