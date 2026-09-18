'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';

export default function AdminAuditLogPage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const auditLogs = useStore((state) => state.auditLogs);
  const [filterAction, setFilterAction] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  
  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isAdmin(currentUser)) {
    return null;
  }
  
  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterTeam && log.team_id !== filterTeam) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const uniqueActions = [...new Set(auditLogs.map((log) => log.action))];
  
  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Team', 'Action', 'Previous Value', 'New Value'].join(','),
      ...filteredLogs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.user_id,
        teams.find((t) => t.id === log.team_id)?.team_name || 'N/A',
        log.action,
        log.previous_value || 'N/A',
        log.new_value || 'N/A',
      ].join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arkk_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Audit Log</span>
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
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Team</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.team_name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterAction('');
                  setFilterTeam('');
                }}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <button
            onClick={exportLogs}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
          >
            Export to CSV
          </button>
        </div>
        
        {/* Audit Log Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Event History</h2>
            <p className="text-gray-400 text-sm">Showing {filteredLogs.length} of {auditLogs.length} entries</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Previous Value</th>
                  <th className="pb-3">New Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700/50">
                    <td className="py-3 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 text-sm font-mono">{log.user_id.slice(0, 8)}...</td>
                    <td className="py-3">{teams.find((t) => t.id === log.team_id)?.team_name || '-'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">{log.action}</span>
                    </td>
                    <td className="py-3 text-sm text-gray-400 max-w-xs truncate">{log.previous_value || '-'}</td>
                    <td className="py-3 text-sm text-gray-400 max-w-xs truncate">{log.new_value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">No audit logs found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
