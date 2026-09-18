'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isParticipant } from '@/lib/auth';

export default function ParticipantRound4Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const zones = useStore((state) => state.zones);
  const scores = useStore((state) => state.scores);
  const round4State = useStore((state) => state.round4State);
  const eventState = useStore((state) => state.eventState);
  const videos = useStore((state) => state.videos);
  
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
  const teamScores = scores.filter((s) => s.team_id === currentUser.team_id && s.round === 4);
  const teamVideo = videos.find((v) => v.team_id === currentUser.team_id);
  
  const situation = teamScores.find((s) => s.category === 'Situation Response')?.marks || 0;
  const presentation = teamScores.find((s) => s.category === 'Presentation')?.marks || 0;
  const accuracy = teamScores.find((s) => s.category === 'Accuracy')?.marks || 0;
  const pressHandling = teamScores.find((s) => s.category === 'Press Handling')?.marks || 0;
  const total = situation + presentation + accuracy + pressHandling;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 4 - Press Conference</span>
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
              round4State.active ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {round4State.active ? 'Active' : 'Not Started'}
            </span>
          </div>
          <p className="text-gray-400">{eventState.current_activity}</p>
        </div>
        
        {/* Team Information */}
        {round4State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Team:</span>
                  <span className="font-semibold">{team?.team_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Zone:</span>
                  <span>{ownedZone?.name || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Region:</span>
                  <span>{ownedZone?.region || 'None'}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Promotion Video:</span>
                  <span>
                    {teamVideo ? (
                      <span className="text-green-400">Submitted</span>
                    ) : (
                      <span className="text-red-400">Not Submitted</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Scores */}
        {round4State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Round 4 Scores</h2>
            
            {total > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Situation Response</p>
                    <p className="text-2xl font-bold">{situation}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Presentation</p>
                    <p className="text-2xl font-bold">{presentation}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Accuracy</p>
                    <p className="text-2xl font-bold">{accuracy}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-sm mb-1">Press Handling</p>
                    <p className="text-2xl font-bold">{pressHandling}</p>
                  </div>
                </div>
                
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Total Score</p>
                  <p className="text-4xl font-bold text-green-400">{total}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">Scores not yet available</p>
                <p className="text-gray-500 text-sm mt-2">Wait for the Admin/Judges to evaluate your press conference</p>
              </div>
            )}
          </div>
        )}
        
        {/* Instructions */}
        {round4State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <div className="space-y-3 text-gray-300">
              <p>• Present your company and zone to the ARKK Board and press.</p>
              <p>• Answer questions about your proposal, strategy, and decisions.</p>
              <p>• Demonstrate your team's knowledge and preparedness.</p>
              <p>• Handle press questions professionally and confidently.</p>
              <p>• Your performance will be evaluated on: Situation Response, Presentation, Accuracy, and Press Handling.</p>
              <p>• Wait for the Admin to call your team for the press conference.</p>
            </div>
          </div>
        )}
        
        {/* Round Not Started */}
        {!round4State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Round 4 has not started yet</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the round</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
