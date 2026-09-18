'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import AdminRoundScoringPanel from '@/components/AdminRoundScoringPanel';

export default function AdminRound3Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const videos = useStore((state) => state.videos);
  const round3State = useStore((state) => state.round3State);
  const eventState = useStore((state) => state.eventState);
  
  const [deadline, setDeadline] = useState('');
  const [maxFileSize, setMaxFileSize] = useState('100');
  
  const updateRound3State = useStore((state) => state.updateRound3State);
  const updateEventState = useStore((state) => state.updateEventState);
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
    updateEventState({ current_round: 3, current_activity: 'Round 3 - Promotion Video', event_status: 'in_progress' });
    updateRound3State({ active: true });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_ROUND_3',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleSetDeadline = () => {
    if (!deadline) return;
    
    updateRound3State({ upload_deadline: deadline, max_file_size: parseInt(maxFileSize) });
    updateEventState({ current_activity: `Video Upload Deadline: ${deadline}` });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'SET_DEADLINE',
      new_value: deadline,
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRound = () => {
    updateEventState({ current_round: 4, current_activity: 'Round 4 Starting', event_status: 'in_progress' });
    updateRound3State({ active: false });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_ROUND_3',
      timestamp: new Date().toISOString(),
    });
  };
  
  const isDeadlinePassed = round3State.upload_deadline ? new Date(round3State.upload_deadline) < new Date() : false;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 3 - Promotion Video</span>
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
          
          {!round3State.active ? (
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start Round 3
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
                End Round 3
              </button>
            </div>
          )}
        </div>

        {/* Round 3 Team Scoring Panel */}
        <AdminRoundScoringPanel
          round={3}
          roundTitle="Round 3 — Promotion Video Scoring"
          description="Enter points for each team in Round 3. Changes immediately reflect in the participant dashboard score panel."
        />
        
        {/* Deadline Configuration */}
        {round3State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Deadline Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max File Size (MB)</label>
                <input
                  type="number"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={handleSetDeadline}
              disabled={!deadline}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              Set Deadline
            </button>
            
            {round3State.upload_deadline && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Current Deadline:</p>
                    <p className="font-semibold">{new Date(round3State.upload_deadline).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Max File Size:</p>
                    <p className="font-semibold">{round3State.max_file_size} MB</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status:</p>
                    <p className={`font-semibold ${isDeadlinePassed ? 'text-red-400' : 'text-green-400'}`}>
                      {isDeadlinePassed ? 'Deadline Passed' : 'Open'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Video Submissions */}
        {round3State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Video Submissions</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">Team</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Upload Time</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.filter((t) => t.active).map((team) => {
                    const video = videos.find((v) => v.team_id === team.id);
                    return (
                      <tr key={team.id} className="border-b border-gray-700/50">
                        <td className="py-3">{team.team_name}</td>
                        <td className="py-3">
                          {video ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              video.status === 'submitted' ? 'bg-green-600/20 text-green-400' :
                              video.status === 'late' ? 'bg-red-600/20 text-red-400' :
                              'bg-yellow-600/20 text-yellow-400'
                            }`}>
                              {video.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">Not Submitted</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-400">
                          {video?.uploaded_at ? new Date(video.uploaded_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-3">
                          {video && (
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors">
                                View
                              </button>
                              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors">
                                Download
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Submitted</p>
                <p className="text-2xl font-bold text-green-400">
                  {videos.filter((v) => v.status === 'submitted').length}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Late</p>
                <p className="text-2xl font-bold text-red-400">
                  {videos.filter((v) => v.status === 'late').length}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {teams.filter((t) => t.active).length - videos.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
