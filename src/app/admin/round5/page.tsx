'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isAdmin } from '@/lib/auth';
import AdminRoundScoringPanel from '@/components/AdminRoundScoringPanel';

export default function AdminRound5Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const deals = useStore((state) => state.deals);
  const round5State = useStore((state) => state.round5State);
  const eventState = useStore((state) => state.eventState);
  
  const [selectedDealId, setSelectedDealId] = useState('');
  
  const updateRound5State = useStore((state) => state.updateRound5State);
  const updateEventState = useStore((state) => state.updateEventState);
  const updateDeal = useStore((state) => state.updateDeal);
  const deductBalance = useStore((state) => state.deductBalance);
  const addBalance = useStore((state) => state.addBalance);
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
  const pendingDeals = deals.filter((d) => d.status === 'pending' || d.status === 'confirmed');
  
  const handleStartRound = () => {
    updateEventState({ current_round: 5, current_activity: 'Round 5 - Negotiation', event_status: 'in_progress' });
    updateRound5State({ active: true, negotiation_open: true });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'START_ROUND_5',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRound = () => {
    updateEventState({ current_round: 6, current_activity: 'Round 6 Starting', event_status: 'in_progress' });
    updateRound5State({ active: false, negotiation_open: false });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'END_ROUND_5',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleApproveDeal = () => {
    if (!selectedDealId) return;
    
    const deal = deals.find((d) => d.id === selectedDealId);
    if (!deal) return;
    
    try {
      // Deduct from buyer
      deductBalance(deal.buyer_team, deal.price, `Deal purchase: ${deal.resource}`, 5);
      
      // Add to seller
      addBalance(deal.seller_team, deal.price, `Deal sale: ${deal.resource}`, 5);
      
      updateDeal(selectedDealId, { status: 'approved' });
      
      addAuditLog({
        id: `log_${Date.now()}`,
        user_id: currentUser.id,
        action: 'APPROVE_DEAL',
        new_value: selectedDealId,
        timestamp: new Date().toISOString(),
      });
      
      setSelectedDealId('');
    } catch (error) {
      alert('Error approving deal: ' + (error as Error).message);
    }
  };
  
  const handleRejectDeal = () => {
    if (!selectedDealId) return;
    
    updateDeal(selectedDealId, { status: 'rejected' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: currentUser.id,
      action: 'REJECT_DEAL',
      new_value: selectedDealId,
      timestamp: new Date().toISOString(),
    });
    
    setSelectedDealId('');
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 5 - Negotiation</span>
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
          
          {!round5State.active ? (
            <button
              onClick={handleStartRound}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Start Round 5
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
                End Round 5
              </button>
            </div>
          )}
        </div>

        {/* Round 5 Team Scoring Panel */}
        <AdminRoundScoringPanel
          round={5}
          roundTitle="Round 5 — Negotiation Scoring"
          description="Enter points for each team in Round 5. Changes immediately reflect in the participant dashboard score panel."
        />
        
        {/* Deal Management */}
        {round5State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Deal Management</h2>
            
            {pendingDeals.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                        <th className="pb-3">Seller</th>
                        <th className="pb-3">Buyer</th>
                        <th className="pb-3">Resource</th>
                        <th className="pb-3">Quantity</th>
                        <th className="pb-3">Price</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gray-700/50">
                          <td className="py-3">{teams.find((t) => t.id === deal.seller_team)?.team_name}</td>
                          <td className="py-3">{teams.find((t) => t.id === deal.buyer_team)?.team_name}</td>
                          <td className="py-3">{deal.resource}</td>
                          <td className="py-3">{deal.quantity}</td>
                          <td className="py-3 text-green-400">{deal.price.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              deal.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                              deal.status === 'confirmed' ? 'bg-blue-600/20 text-blue-400' :
                              deal.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                              'bg-red-600/20 text-red-400'
                            }`}>
                              {deal.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {deal.status === 'confirmed' && (
                              <button
                                onClick={() => setSelectedDealId(deal.id)}
                                className={`px-3 py-1 rounded text-xs transition-colors ${
                                  selectedDealId === deal.id
                                    ? 'bg-green-600'
                                    : 'bg-gray-600 hover:bg-gray-500'
                                }`}
                              >
                                Review
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {selectedDealId && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={handleApproveDeal}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                      >
                        Approve Deal
                      </button>
                      <button
                        onClick={handleRejectDeal}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
                      >
                        Reject Deal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No pending deals</p>
                <p className="text-gray-500 text-sm mt-2">Wait for teams to create and confirm deals</p>
              </div>
            )}
          </div>
        )}
        
        {/* All Deals Overview */}
        {round5State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">All Deals</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Seller</th>
                    <th className="pb-3">Buyer</th>
                    <th className="pb-3">Resource</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className="border-b border-gray-700/50">
                      <td className="py-3 text-xs">{deal.id.slice(0, 8)}...</td>
                      <td className="py-3">{teams.find((t) => t.id === deal.seller_team)?.team_name}</td>
                      <td className="py-3">{teams.find((t) => t.id === deal.buyer_team)?.team_name}</td>
                      <td className="py-3">{deal.resource}</td>
                      <td className="py-3">{deal.quantity}</td>
                      <td className="py-3 text-green-400">{deal.price.toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          deal.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                          deal.status === 'confirmed' ? 'bg-blue-600/20 text-blue-400' :
                          deal.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                          deal.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {new Date(deal.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {deals.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No deals created yet</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
