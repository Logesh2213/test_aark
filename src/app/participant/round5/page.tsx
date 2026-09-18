'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isParticipant } from '@/lib/auth';

export default function ParticipantRound5Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const deals = useStore((state) => state.deals);
  const round5State = useStore((state) => state.round5State);
  const eventState = useStore((state) => state.eventState);
  const teamResources = useStore((state) => state.teamResources);
  const resources = useStore((state) => state.resources);
  
  const [newDealResource, setNewDealResource] = useState('');
  const [newDealQuantity, setNewDealQuantity] = useState('1');
  const [newDealPrice, setNewDealPrice] = useState('');
  const [newDealBuyer, setNewDealBuyer] = useState('');
  const [newDealDeadline, setNewDealDeadline] = useState('');
  const [newDealFailureCondition, setNewDealFailureCondition] = useState('');
  
  const addDeal = useStore((state) => state.addDeal);
  const updateDeal = useStore((state) => state.updateDeal);
  
  useEffect(() => {
    if (!currentUser || !isParticipant(currentUser)) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  if (!currentUser || !isParticipant(currentUser)) {
    return null;
  }
  
  const team = teams.find((t) => t.id === currentUser.team_id);
  const wallet = wallets.find((w) => w.team_id === currentUser.team_id);
  const myTeamResources = teamResources.filter((tr) => tr.team_id === currentUser.team_id);
  const activeTeams = teams.filter((t) => t.active && !t.eliminated && t.id !== currentUser.team_id);
  const myDeals = deals.filter((d) => d.seller_team === currentUser.team_id || d.buyer_team === currentUser.team_id);
  
  const handleCreateDeal = () => {
    if (!newDealResource || !newDealQuantity || !newDealPrice || !newDealBuyer || !newDealDeadline) {
      alert('Please fill in all required fields');
      return;
    }
    
    addDeal({
      id: `deal_${Date.now()}`,
      seller_team: currentUser.team_id!,
      buyer_team: newDealBuyer,
      resource: newDealResource,
      quantity: parseInt(newDealQuantity),
      price: parseInt(newDealPrice),
      deadline: newDealDeadline,
      failure_condition: newDealFailureCondition,
      status: 'pending',
      seller_confirmed: false,
      buyer_confirmed: false,
      created_at: new Date().toISOString(),
    });
    
    // Reset form
    setNewDealResource('');
    setNewDealQuantity('1');
    setNewDealPrice('');
    setNewDealBuyer('');
    setNewDealDeadline('');
    setNewDealFailureCondition('');
  };
  
  const handleConfirmDeal = (dealId: string, isSeller: boolean) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    
    if (isSeller) {
      updateDeal(dealId, { seller_confirmed: true });
    } else {
      updateDeal(dealId, { buyer_confirmed: true });
    }
    
    // If both confirmed, update status
    const updatedDeal = deals.find((d) => d.id === dealId);
    if (updatedDeal?.seller_confirmed && updatedDeal?.buyer_confirmed) {
      updateDeal(dealId, { status: 'confirmed' });
    }
  };
  
  const getResourceName = (resourceId: string) => {
    return resources.find((r) => r.id === resourceId)?.name || 'Unknown';
  };
  
  const getTeamResourceQuantity = (resourceId: string) => {
    return myTeamResources.find((tr) => tr.resource_id === resourceId)?.quantity || 0;
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
              round5State.active ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {round5State.active ? 'Active' : 'Not Started'}
            </span>
          </div>
          <p className="text-gray-400">{eventState.current_activity}</p>
        </div>
        
        {/* Resource Inventory */}
        {round5State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Inventory</h2>
            
            {myTeamResources.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {myTeamResources.map((tr) => (
                  <div key={tr.resource_id} className="bg-gray-700/50 rounded-lg p-4">
                    <p className="font-semibold">{getResourceName(tr.resource_id)}</p>
                    <p className="text-2xl font-bold text-green-400">{tr.quantity}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400">No resources in inventory</p>
              </div>
            )}
          </div>
        )}
        
        {/* Create New Deal */}
        {round5State.active && round5State.negotiation_open && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Deal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Resource to Sell</label>
                <select
                  value={newDealResource}
                  onChange={(e) => setNewDealResource(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select resource</option>
                  {myTeamResources.filter((tr) => tr.quantity > 0).map((tr) => (
                    <option key={tr.resource_id} value={tr.resource_id}>
                      {getResourceName(tr.resource_id)} (Available: {tr.quantity})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                <input
                  type="number"
                  value={newDealQuantity}
                  onChange={(e) => setNewDealQuantity(e.target.value)}
                  min="1"
                  max={newDealResource ? getTeamResourceQuantity(newDealResource) : 1}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Price (ARK)</label>
                <input
                  type="number"
                  value={newDealPrice}
                  onChange={(e) => setNewDealPrice(e.target.value)}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter price"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Buyer Team</label>
                <select
                  value={newDealBuyer}
                  onChange={(e) => setNewDealBuyer(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select buyer</option>
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.team_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deadline</label>
                <input
                  type="datetime-local"
                  value={newDealDeadline}
                  onChange={(e) => setNewDealDeadline(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Failure Condition (Optional)</label>
                <input
                  type="text"
                  value={newDealFailureCondition}
                  onChange={(e) => setNewDealFailureCondition(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., If payment not received within 24h"
                />
              </div>
            </div>
            
            <button
              onClick={handleCreateDeal}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
            >
              Create Deal
            </button>
          </div>
        )}
        
        {/* My Deals */}
        {round5State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Your Deals</h2>
            
            {myDeals.length > 0 ? (
              <div className="space-y-4">
                {myDeals.map((deal) => {
                  const isSeller = deal.seller_team === currentUser.team_id;
                  const otherParty = isSeller ? deal.buyer_team : deal.seller_team;
                  
                  return (
                    <div key={deal.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">
                            {isSeller ? 'Selling to' : 'Buying from'} {teams.find((t) => t.id === otherParty)?.team_name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {deal.resource} x {deal.quantity} for {deal.price.toLocaleString()} ARK
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          deal.status === 'pending' ? 'bg-yellow-600' :
                          deal.status === 'confirmed' ? 'bg-blue-600' :
                          deal.status === 'approved' ? 'bg-green-600' :
                          deal.status === 'rejected' ? 'bg-red-600' :
                          'bg-gray-600'
                        }`}>
                          {deal.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-400">Deadline:</p>
                          <p>{new Date(deal.deadline).toLocaleString()}</p>
                        </div>
                        {deal.failure_condition && (
                          <div>
                            <p className="text-gray-400">Failure Condition:</p>
                            <p>{deal.failure_condition}</p>
                          </div>
                        )}
                      </div>
                      
                      {deal.status === 'pending' && (
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <p className="text-gray-400">
                              {isSeller ? `Seller confirmed: ${deal.seller_confirmed ? 'Yes' : 'No'}` : `Buyer confirmed: ${deal.buyer_confirmed ? 'Yes' : 'No'}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleConfirmDeal(deal.id, isSeller)}
                            disabled={isSeller ? deal.seller_confirmed : deal.buyer_confirmed}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                          >
                            {isSeller ? 'Confirm as Seller' : 'Confirm as Buyer'}
                          </button>
                        </div>
                      )}
                      
                      {deal.status === 'approved' && (
                        <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg text-center">
                          <p className="text-green-400 font-semibold">Deal Approved</p>
                          <p className="text-gray-400 text-sm">Resources and ARK have been transferred</p>
                        </div>
                      )}
                      
                      {deal.status === 'rejected' && (
                        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg text-center">
                          <p className="text-red-400 font-semibold">Deal Rejected</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No deals yet</p>
                <p className="text-gray-500 text-sm mt-2">Create a deal to start negotiating with other teams</p>
              </div>
            )}
          </div>
        )}
        
        {/* Round Not Started */}
        {!round5State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Round 5 has not started yet</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the round</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
