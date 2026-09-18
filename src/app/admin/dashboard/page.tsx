'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin, getSavedSession } from '@/lib/auth';
import { initializeDemoData } from '@/lib/demo-data';

export default function AdminDashboardPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const eventState = useStore((state) => state.eventState);
  const wallets = useStore((state) => state.wallets);
  const scores = useStore((state) => state.scores);
  const resetAllData = useStore((state) => state.resetAllData);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  
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
  
  const activeUser = currentUser || getSavedSession('admin');
  if (!activeUser || !isAdmin(activeUser)) {
    return null;
  }
  
  const activeTeams = teams.filter((t) => t.active && !t.eliminated);
  const totalArc = wallets.reduce((sum, w) => sum + w.usable_balance + w.frozen_balance, 0);
  
  const handleResetAllData = async () => {
    setResetting(true);
    try {
      // 1. Reset central server state first
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch (err) {
        console.error('Failed to reset server state:', err);
      }
      // 2. Reset client store and broadcast epoch to all client tabs
      resetAllData();
      // 3. Clear local client storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      // 4. Force reinitialize clean baseline demo data
      await initializeDemoData(true);
      // 5. Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Error resetting data:', error);
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };
  
  const leaderboard = teams
    .filter((t) => t.active)
    .map((team) => {
      const teamScores = scores.filter((s) => s.team_id === team.id);
      const totalScore = teamScores.reduce((sum, s) => sum + s.marks, 0);
      const wallet = wallets.find((w) => w.team_id === team.id);
      return {
        ...team,
        totalScore,
        balance: wallet?.usable_balance || 0,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Admin Control Panel</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Round {eventState.current_round}</span>
            <span className="px-3 py-1 bg-blue-600 rounded-full text-sm">
              {eventState.event_status}
            </span>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Reset All Data
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        {/* Event Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Current Round</h3>
            <p className="text-3xl font-bold text-white">{eventState.current_round || 'Not Started'}</p>
            <p className="text-gray-500 text-sm mt-1">{eventState.current_activity}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Active Teams</h3>
            <p className="text-3xl font-bold text-white">{activeTeams.length}</p>
            <p className="text-gray-500 text-sm mt-1">of {teams.length} total</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Total ARK in Circulation</h3>
            <p className="text-3xl font-bold text-green-400">{totalArc.toLocaleString()} ARK</p>
            <p className="text-gray-500 text-sm mt-1">ARK Credits</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-gray-400 text-sm mb-2">Event Status</h3>
            <p className="text-3xl font-bold text-blue-400 capitalize">{eventState.event_status}</p>
            <p className="text-gray-500 text-sm mt-1">
              {eventState.timer_running ? 'Timer Active' : 'Timer Stopped'}
            </p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button 
              onClick={() => router.push('/admin/round1a')}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 1A
            </button>
            <button 
              onClick={() => router.push('/admin/round1b')}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 1B
            </button>
            <button 
              onClick={() => router.push('/admin/round2')}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 2
            </button>
            <button 
              onClick={() => router.push('/admin/round3')}
              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 3
            </button>
            <button 
              onClick={() => router.push('/admin/round4')}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 4
            </button>
            <button 
              onClick={() => router.push('/admin/round5')}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 5
            </button>
            <button 
              onClick={() => router.push('/admin/round6')}
              className="px-4 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium transition-colors"
            >
              Round 6
            </button>
          </div>
        </div>
        
        {/* Leaderboard Preview */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Leaderboard (Top 5)</h2>
            <button 
              onClick={() => router.push('/admin/leaderboard')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View Full Leaderboard
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Zone</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">ARK Balance</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((team, index) => (
                  <tr key={team.id} className="border-b border-gray-700/50">
                    <td className="py-3 font-bold">{index + 1}</td>
                    <td className="py-3">{team.team_name}</td>
                    <td className="py-3 text-gray-400">-</td>
                    <td className="py-3 font-bold text-green-400">{team.totalScore}</td>
                    <td className="py-3">{team.balance.toLocaleString()}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Teams</h3>
            <p className="text-gray-400 text-sm">Manage teams and credentials</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round1a')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 1A</h3>
            <p className="text-gray-400 text-sm">Question bidding control</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round1b')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 1B</h3>
            <p className="text-gray-400 text-sm">Zone auction control</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round2')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 2</h3>
            <p className="text-gray-400 text-sm">Waves and proposals</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round3')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 3</h3>
            <p className="text-gray-400 text-sm">Video uploads</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round4')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 4</h3>
            <p className="text-gray-400 text-sm">Press conference scoring</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round5')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 5</h3>
            <p className="text-gray-400 text-sm">Negotiations and deals</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/round6')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Round 6</h3>
            <p className="text-gray-400 text-sm">Final board meeting</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Questions</h3>
            <p className="text-gray-400 text-sm">Question database</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Zones</h3>
            <p className="text-gray-400 text-sm">Zone management</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Resources</h3>
            <p className="text-gray-400 text-sm">Resource inventory</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Scores</h3>
            <p className="text-gray-400 text-sm">Score management</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/leaderboard')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Leaderboard</h3>
            <p className="text-gray-400 text-sm">View rankings</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/audit')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors"
          >
            <h3 className="font-bold text-lg mb-2">Audit Log</h3>
            <p className="text-gray-400 text-sm">Event history</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">Event configuration</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-6 text-left transition-colors">
            <h3 className="font-bold text-lg mb-2">Submissions</h3>
            <p className="text-gray-400 text-sm">View all submissions</p>
          </button>
        </div>
        
        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-red-400">Reset All Data</h3>
              <p className="text-gray-300 mb-6">
                This will permanently delete all data including:
              </p>
              <ul className="text-gray-400 text-sm mb-6 list-disc list-inside space-y-1">
                <li>All teams and users</li>
                <li>All scores and transactions</li>
                <li>All zones and questions</li>
                <li>All proposals, videos, and deals</li>
                <li>All audit logs</li>
                <li>All round progress</li>
              </ul>
              <p className="text-yellow-400 text-sm mb-6">
                This action cannot be undone. New demo data will be generated after reset.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAllData}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
