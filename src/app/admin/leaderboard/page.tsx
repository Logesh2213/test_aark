'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';

export default function AdminLeaderboardPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const zones = useStore((state) => state.zones);
  const wallets = useStore((state) => state.wallets);
  const scores = useStore((state) => state.scores);
  const eventState = useStore((state) => state.eventState);
  
  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isAdmin(currentUser)) {
    return null;
  }
  
  const leaderboard = teams
    .filter((t) => t.active)
    .map((team) => {
      const teamScores = scores.filter((s) => s.team_id === team.id);
      const totalScore = teamScores.reduce((sum, s) => sum + s.marks, 0);
      const wallet = wallets.find((w) => w.team_id === team.id);
      const zone = zones.find((z) => z.owner_team_id === team.id);
      
      const roundScores = [1, 2, 3, 4, 5, 6].map((round) =>
        teamScores.filter((s) => s.round === round).reduce((sum, s) => sum + s.marks, 0)
      );
      
      return {
        ...team,
        totalScore,
        balance: wallet?.usable_balance || 0,
        zone: zone?.name || 'None',
        roundScores,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
  
  const toggleLeaderboardVisibility = () => {
    useStore.getState().updateEventState({ leaderboard_visible: !eventState.leaderboard_visible });
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Leaderboard</span>
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
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Leaderboard Controls</h2>
            <button
              onClick={toggleLeaderboardVisibility}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                eventState.leaderboard_visible
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {eventState.leaderboard_visible ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
          </div>
          <p className="text-gray-400 mt-2">
            Current visibility: {eventState.leaderboard_visible ? 'Visible to participants' : 'Hidden from participants'}
          </p>
        </div>
        
        {/* Leaderboard Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Full Leaderboard</h2>
          
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
                  <th className="pb-3">ARK Balance</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((team, index) => (
                  <tr key={team.id} className="border-b border-gray-700/50">
                    <td className="py-3 font-bold">{index + 1}</td>
                    <td className="py-3">{team.team_name}</td>
                    <td className="py-3 text-gray-400">{team.zone}</td>
                    {team.roundScores.map((score, i) => (
                      <td key={i} className="py-3">{score}</td>
                    ))}
                    <td className="py-3 font-bold text-green-400">{team.totalScore}</td>
                    <td className="py-3">{team.balance.toLocaleString()}</td>
                    <td className="py-3">
                      {team.eliminated ? (
                        <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs">Eliminated</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Total Teams</p>
              <p className="text-2xl font-bold">{leaderboard.length}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Active Teams</p>
              <p className="text-2xl font-bold text-green-400">{leaderboard.filter((t) => !t.eliminated).length}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Eliminated Teams</p>
              <p className="text-2xl font-bold text-red-400">{leaderboard.filter((t) => t.eliminated).length}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Total ARK in Circulation</p>
              <p className="text-2xl font-bold">{leaderboard.reduce((sum, t) => sum + t.balance, 0).toLocaleString()} ARK</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
