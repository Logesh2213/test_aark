'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import AdminRoundScoringPanel from '@/components/AdminRoundScoringPanel';

export default function AdminRound2Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const round2Waves = useStore((state) => state.round2Waves);
  const round2State = useStore((state) => state.round2State);
  const eventState = useStore((state) => state.eventState);
  const storeItems = useStore((state) => state.storeItems);
  const proposals = useStore((state) => state.proposals);
  
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  
  const updateRound2State = useStore((state) => state.updateRound2State);
  const updateEventState = useStore((state) => state.updateEventState);
  const updateRound2Wave = useStore((state) => state.updateRound2Wave);
  const releaseFrozenBalance = useStore((state) => state.releaseFrozenBalance);
  const addAuditLog = useStore((state) => state.addAuditLog);
  
  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isAdmin(currentUser)) {
    return null;
  }
  
  const handleStartRound = () => {
    updateEventState({ current_round: 2, current_activity: 'Round 2 - Allotment & Proposal', event_status: 'in_progress' });
    updateRound2State({ active: true, frozen_released: true });
    
    // Release frozen balance for all teams
    teams.forEach((team) => {
      if (team.active && !team.eliminated) {
        releaseFrozenBalance(team.id);
      }
    });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_ROUND_2',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleStartWave = () => {
    if (!selectedWaveId) return;
    
    updateRound2Wave(selectedWaveId, { active: true });
    updateRound2State({
      current_wave_id: selectedWaveId,
      wave_active: true,
    });
    
    const wave = round2Waves.find((w) => w.id === selectedWaveId);
    updateEventState({ current_activity: `Wave ${wave?.wave_number} - ${wave?.question}` });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_WAVE',
      new_value: selectedWaveId,
      timestamp: new Date().toISOString(),
    });
    
    setSelectedWaveId('');
  };
  
  const handleEndWave = () => {
    if (!round2State.current_wave_id) return;
    
    updateRound2Wave(round2State.current_wave_id, { active: false });
    updateRound2State({
      current_wave_id: undefined,
      wave_active: false,
    });
    
    updateEventState({ current_activity: 'Wave ended - Ready for next wave' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_WAVE',
      new_value: round2State.current_wave_id,
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleOpenStore = () => {
    updateRound2State({ store_open: true });
    updateEventState({ current_activity: 'Store Open - Teams can purchase items' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'OPEN_STORE',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleCloseStore = () => {
    updateRound2State({ store_open: false });
    updateEventState({ current_activity: 'Store Closed' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'CLOSE_STORE',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleOpenProposalSubmission = () => {
    updateRound2State({ proposal_submission_open: true });
    updateEventState({ current_activity: 'Proposal Submission Open' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'OPEN_PROPOSAL_SUBMISSION',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleCloseProposalSubmission = () => {
    updateRound2State({ proposal_submission_open: false });
    updateEventState({ current_activity: 'Proposal Submission Closed' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'CLOSE_PROPOSAL_SUBMISSION',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRound = () => {
    updateEventState({ current_round: 3, current_activity: 'Round 3 Starting', event_status: 'in_progress' });
    updateRound2State({ active: false });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_ROUND_2',
      timestamp: new Date().toISOString(),
    });
  };
  
  const currentWave = round2Waves.find((w) => w.id === round2State.current_wave_id);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 2 - Allotment & Proposal</span>
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
          
          {!round2State.active ? (
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start Round 2
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-green-600 rounded-full text-sm">Round Active</span>
                <span className="text-gray-400">{eventState.current_activity}</span>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleOpenStore}
                  disabled={round2State.store_open}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Open Store
                </button>
                <button
                  onClick={handleCloseStore}
                  disabled={!round2State.store_open}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Close Store
                </button>
                <button
                  onClick={handleOpenProposalSubmission}
                  disabled={round2State.proposal_submission_open}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Open Proposal Submission
                </button>
                <button
                  onClick={handleCloseProposalSubmission}
                  disabled={!round2State.proposal_submission_open}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Close Proposal Submission
                </button>
                <button
                  onClick={handleEndRound}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg font-medium transition-colors"
                >
                  End Round 2
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Round 2 Team Scoring Panel */}
        <AdminRoundScoringPanel
          round={2}
          roundTitle="Round 2 — Allotment & Proposal Scoring"
          description="Enter points for each team in Round 2. Changes immediately reflect in the participant dashboard score panel."
        />
        
        {/* Wave Control */}
        {round2State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Wave Control</h2>
            
            {currentWave && round2State.wave_active ? (
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-bold mb-2">Wave {currentWave.wave_number}</h3>
                  <p className="text-gray-300 mb-2">{currentWave.question}</p>
                  <p className="text-sm text-gray-400">{currentWave.instructions}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="text-gray-400">Time Limit: {currentWave.time_limit}s</span>
                    <span className="text-green-400">Max Marks: {currentWave.max_marks}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleEndWave}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
                >
                  End Wave
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {round2Waves.filter((w) => !w.active).map((wave) => (
                    <button
                      key={wave.id}
                      onClick={() => setSelectedWaveId(wave.id)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        selectedWaveId === wave.id
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">Wave {wave.wave_number}</span>
                        <span className="text-green-400">{wave.max_marks} pts</span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{wave.question}</p>
                    </button>
                  ))}
                </div>
                
                {selectedWaveId && (
                  <button
                    onClick={handleStartWave}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                  >
                    Start Wave
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Store Status */}
        {round2State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Store Status</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Store is currently:</p>
                <p className={`text-2xl font-bold ${round2State.store_open ? 'text-green-400' : 'text-red-400'}`}>
                  {round2State.store_open ? 'OPEN' : 'CLOSED'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400">Available Items:</p>
                <p className="text-2xl font-bold">{storeItems.filter((i) => i.availability > 0).length}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Team Balances After Frozen Release */}
        {round2State.active && round2State.frozen_released && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Team Balances (After Frozen Release)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Usable ARK</th>
                    <th className="pb-3">Frozen ARK</th>
                    <th className="pb-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.filter((t) => t.active).map((team) => {
                    const wallet = wallets.find((w) => w.team_id === team.id);
                    return (
                      <tr key={team.id} className="border-b border-gray-700/50">
                        <td className="py-3">{team.team_name}</td>
                        <td className="py-3 text-green-400 font-semibold">{wallet?.usable_balance.toLocaleString()}</td>
                        <td className="py-3 text-yellow-400">{wallet?.frozen_balance.toLocaleString()}</td>
                        <td className="py-3 font-bold">{(wallet?.usable_balance || 0) + (wallet?.frozen_balance || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Proposals Overview */}
        {round2State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Proposals Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Zone</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.filter((t) => t.active).map((team) => {
                    const proposal = proposals.find((p) => p.team_id === team.id);
                    return (
                      <tr key={team.id} className="border-b border-gray-700/50">
                        <td className="py-3">{team.team_name}</td>
                        <td className="py-3 text-gray-400">-</td>
                        <td className="py-3">
                          {proposal ? (
                            <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Submitted</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs">Pending</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-400">
                          {proposal?.submitted_at ? new Date(proposal.submitted_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
