'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import AdminRoundScoringPanel from '@/components/AdminRoundScoringPanel';

export default function AdminRound4Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const zones = useStore((state) => state.zones);
  const scores = useStore((state) => state.scores);
  const round4State = useStore((state) => state.round4State);
  const eventState = useStore((state) => state.eventState);
  const videos = useStore((state) => state.videos);
  
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [situationResponse, setSituationResponse] = useState('');
  const [presentationScore, setPresentationScore] = useState('');
  const [accuracyScore, setAccuracyScore] = useState('');
  const [pressHandlingScore, setPressHandlingScore] = useState('');
  
  const updateRound4State = useStore((state) => state.updateRound4State);
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
  
  const activeTeams = teams.filter((t) => t.active && !t.eliminated);
  
  const handleStartRound = () => {
    updateEventState({ current_round: 4, current_activity: 'Round 4 - Press Conference', event_status: 'in_progress' });
    updateRound4State({ active: true, scoring_open: true });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_ROUND_4',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRound = () => {
    updateEventState({ current_round: 5, current_activity: 'Round 5 Starting', event_status: 'in_progress' });
    updateRound4State({ active: false, scoring_open: false });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_ROUND_4',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleSubmitScores = () => {
    if (!selectedTeamId) return;
    
    const situation = parseInt(situationResponse) || 0;
    const presentation = parseInt(presentationScore) || 0;
    const accuracy = parseInt(accuracyScore) || 0;
    const pressHandling = parseInt(pressHandlingScore) || 0;
    const total = situation + presentation + accuracy + pressHandling;
    
    // Remove existing Round 4 scores for this team
    const existingScores = scores.filter((s) => s.team_id === selectedTeamId && s.round === 4);
    existingScores.forEach((s) => {
      updateScore(s.id, { marks: 0 });
    });
    
    // Add new scores
    addScore({
      id: `score_${Date.now()}_1`,
      team_id: selectedTeamId,
      round: 4,
      category: 'Situation Response',
      marks: situation,
    });
    
    addScore({
      id: `score_${Date.now()}_2`,
      team_id: selectedTeamId,
      round: 4,
      category: 'Presentation',
      marks: presentation,
    });
    
    addScore({
      id: `score_${Date.now()}_3`,
      team_id: selectedTeamId,
      round: 4,
      category: 'Accuracy',
      marks: accuracy,
    });
    
    addScore({
      id: `score_${Date.now()}_4`,
      team_id: selectedTeamId,
      round: 4,
      category: 'Press Handling',
      marks: pressHandling,
    });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      team_id: selectedTeamId,
      action: 'SUBMIT_ROUND_4_SCORES',
      new_value: `Total: ${total}`,
      timestamp: new Date().toISOString(),
    });
    
    // Reset form
    setSelectedTeamId('');
    setSituationResponse('');
    setPresentationScore('');
    setAccuracyScore('');
    setPressHandlingScore('');
  };
  
  const getTeamRound4Score = (teamId: string) => {
    const teamScores = scores.filter((s) => s.team_id === teamId && s.round === 4);
    return teamScores.reduce((sum, s) => sum + s.marks, 0);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 4 - Press Conference</span>
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
          
          {!round4State.active ? (
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start Round 4
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
                End Round 4
              </button>
            </div>
          )}
        </div>

        {/* Round 4 Team Scoring Panel */}
        <AdminRoundScoringPanel
          round={4}
          roundTitle="Round 4 — Press Conference Scoring"
          description="Enter points for each team in Round 4. Changes immediately reflect in the participant dashboard score panel."
        />
        
        {/* Scoring Form */}
        {round4State.active && round4State.scoring_open && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Press Conference Scoring</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a team</option>
                  {activeTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
                
                {selectedTeamId && (
                  <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Zone:</span>
                        <span>{zones.find((z) => z.owner_team_id === selectedTeamId)?.name || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Video Status:</span>
                        <span>
                          {videos.find((v) => v.team_id === selectedTeamId) ? (
                            <span className="text-green-400">Submitted</span>
                          ) : (
                            <span className="text-red-400">Not Submitted</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Score:</span>
                        <span className="font-bold">{getTeamRound4Score(selectedTeamId)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Score Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Situation Response (0-100)</label>
                  <input
                    type="number"
                    value={situationResponse}
                    onChange={(e) => setSituationResponse(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter score"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Presentation (0-100)</label>
                  <input
                    type="number"
                    value={presentationScore}
                    onChange={(e) => setPresentationScore(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter score"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Accuracy (0-50)</label>
                  <input
                    type="number"
                    value={accuracyScore}
                    onChange={(e) => setAccuracyScore(e.target.value)}
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter score"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Press Handling (0-50)</label>
                  <input
                    type="number"
                    value={pressHandlingScore}
                    onChange={(e) => setPressHandlingScore(e.target.value)}
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter score"
                  />
                </div>
                
                {selectedTeamId && (
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Score:</span>
                      <span className="text-2xl font-bold text-green-400">
                        {(parseInt(situationResponse) || 0) + (parseInt(presentationScore) || 0) + (parseInt(accuracyScore) || 0) + (parseInt(pressHandlingScore) || 0)}
                      </span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSubmitScores}
                  disabled={!selectedTeamId}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Submit Scores
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Scores Overview */}
        {round4State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Round 4 Scores Overview</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Zone</th>
                    <th className="pb-3">Situation</th>
                    <th className="pb-3">Presentation</th>
                    <th className="pb-3">Accuracy</th>
                    <th className="pb-3">Press Handling</th>
                    <th className="pb-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTeams.map((team) => {
                    const teamScores = scores.filter((s) => s.team_id === team.id && s.round === 4);
                    const situation = teamScores.find((s) => s.category === 'Situation Response')?.marks || 0;
                    const presentation = teamScores.find((s) => s.category === 'Presentation')?.marks || 0;
                    const accuracy = teamScores.find((s) => s.category === 'Accuracy')?.marks || 0;
                    const pressHandling = teamScores.find((s) => s.category === 'Press Handling')?.marks || 0;
                    const total = situation + presentation + accuracy + pressHandling;
                    
                    return (
                      <tr key={team.id} className="border-b border-gray-700/50">
                        <td className="py-3">{team.team_name}</td>
                        <td className="py-3 text-gray-400">{zones.find((z) => z.owner_team_id === team.id)?.name || 'None'}</td>
                        <td className="py-3">{situation}</td>
                        <td className="py-3">{presentation}</td>
                        <td className="py-3">{accuracy}</td>
                        <td className="py-3">{pressHandling}</td>
                        <td className="py-3 font-bold text-green-400">{total}</td>
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
