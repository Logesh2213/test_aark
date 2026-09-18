'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isParticipant } from '@/lib/auth';

export default function ParticipantRound2Page() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const zones = useStore((state) => state.zones);
  const wallets = useStore((state) => state.wallets);
  const round2Waves = useStore((state) => state.round2Waves);
  const round2State = useStore((state) => state.round2State);
  const eventState = useStore((state) => state.eventState);
  const storeItems = useStore((state) => state.storeItems);
  const purchases = useStore((state) => state.purchases);
  const proposals = useStore((state) => state.proposals);
  
  const [waveResponse, setWaveResponse] = useState('');
  const [waveSubmitted, setWaveSubmitted] = useState(false);
  
  // Proposal form state
  const [proposalProblem, setProposalProblem] = useState('');
  const [proposalShortage, setProposalShortage] = useState('');
  const [proposalPurchases, setProposalPurchases] = useState('');
  const [proposalBuildPlan, setProposalBuildPlan] = useState('');
  const [proposalTimeline, setProposalTimeline] = useState('');
  const [proposalFinancialPlan, setProposalFinancialPlan] = useState('');
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  
  const addPurchase = useStore((state) => state.addPurchase);
  const updateStoreItem = useStore((state) => state.updateStoreItem);
  const deductBalance = useStore((state) => state.deductBalance);
  const addRound2Submission = useStore((state) => state.addRound2Submission);
  const addProposal = useStore((state) => state.addProposal);
  
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
  const wallet = wallets.find((w) => w.team_id === currentUser.team_id);
  const currentWave = round2Waves.find((w) => w.id === round2State.current_wave_id);
  const existingProposal = proposals.find((p) => p.team_id === currentUser.team_id);
  const teamPurchases = purchases.filter((p) => p.team_id === currentUser.team_id);
  
  const handleWaveSubmit = () => {
    if (!waveResponse.trim() || !round2State.current_wave_id) return;
    
    addRound2Submission({
      id: `sub_${Date.now()}`,
      team_id: currentUser.team_id!,
      wave_id: round2State.current_wave_id,
      response: waveResponse,
      submitted_at: new Date().toISOString(),
    });
    
    setWaveSubmitted(true);
  };
  
  const handlePurchase = () => {
    if (!selectedItem || !itemQuantity) return;
    
    const item = storeItems.find((i) => i.id === selectedItem);
    if (!item) return;
    
    const quantity = parseInt(itemQuantity);
    const totalCost = item.cost * quantity;
    
    if (!wallet || wallet.usable_balance < totalCost) {
      alert('Insufficient balance');
      return;
    }
    
    try {
      deductBalance(currentUser.team_id!, totalCost, `Purchase: ${item.name} x${quantity}`, 2);
      
      addPurchase({
        id: `pur_${Date.now()}`,
        team_id: currentUser.team_id!,
        item_id: selectedItem,
        quantity,
        amount: totalCost,
        round: 2,
        timestamp: new Date().toISOString(),
      });
      
      updateStoreItem(selectedItem, { availability: item.availability - quantity });
      
      setSelectedItem('');
      setItemQuantity('1');
    } catch (error) {
      alert('Error making purchase: ' + (error as Error).message);
    }
  };
  
  const handleProposalSubmit = () => {
    if (!proposalProblem || !proposalShortage || !proposalPurchases || !proposalBuildPlan || !proposalTimeline || !proposalFinancialPlan) {
      alert('Please fill in all fields');
      return;
    }
    
    addProposal({
      id: `prop_${Date.now()}`,
      team_id: currentUser.team_id!,
      problem: proposalProblem,
      shortage: proposalShortage,
      purchases: proposalPurchases,
      build_plan: proposalBuildPlan,
      timeline: proposalTimeline,
      financial_plan: proposalFinancialPlan,
      submitted_at: new Date().toISOString(),
    });
    
    setProposalSubmitted(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Round 2 - Allotment & Proposal</span>
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
              round2State.active ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              {round2State.active ? 'Active' : 'Not Started'}
            </span>
          </div>
          <p className="text-gray-400">{eventState.current_activity}</p>
        </div>
        
        {/* Zone Information */}
        {ownedZone && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Zone</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Zone Name:</span>
                <span className="font-semibold">{ownedZone.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Region:</span>
                <span>{ownedZone.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Terrain:</span>
                <span>{ownedZone.terrain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposits:</span>
                <span>{ownedZone.deposits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Production Capability:</span>
                <span>{ownedZone.production_capability}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Problem:</span>
                <span className="text-red-400">{ownedZone.problem}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Current Wave */}
        {round2State.active && currentWave && round2State.wave_active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Current Wave - {currentWave.wave_number}</h2>
            
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <p className="text-lg font-semibold mb-2">{currentWave.question}</p>
              <p className="text-gray-400 text-sm">{currentWave.instructions}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-gray-400">Time Limit: {currentWave.time_limit}s</span>
                <span className="text-green-400">Max Marks: {currentWave.max_marks}</span>
              </div>
            </div>
            
            {!waveSubmitted ? (
              <div className="space-y-4">
                <textarea
                  value={waveResponse}
                  onChange={(e) => setWaveResponse(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                  placeholder="Enter your response..."
                />
                <button
                  onClick={handleWaveSubmit}
                  disabled={!waveResponse.trim()}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Submit Response
                </button>
              </div>
            ) : (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                <p className="text-green-400 font-semibold">Response Submitted</p>
                <p className="text-gray-400 text-sm mt-1">Wait for the next wave</p>
              </div>
            )}
          </div>
        )}
        
        {/* Store */}
        {round2State.active && round2State.store_open && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Store</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {storeItems.filter((i) => i.availability > 0).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedItem === item.id
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{item.name}</span>
                    <span className="text-green-400 font-bold">{item.cost.toLocaleString()} ARK</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{item.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Effect: {item.effect}</span>
                    <span className="text-yellow-400">Available: {item.availability}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedItem && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      min="1"
                      max={storeItems.find((i) => i.id === selectedItem)?.availability}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-2">Total Cost</p>
                    <p className="text-2xl font-bold text-green-400">
                      {(storeItems.find((i) => i.id === selectedItem)?.cost || 0) * parseInt(itemQuantity || '1')}
                    </p>
                  </div>
                  <button
                    onClick={handlePurchase}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors self-end"
                  >
                    Purchase
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Purchase History */}
        {teamPurchases.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Purchases</h2>
            <div className="space-y-2">
              {teamPurchases.map((purchase) => {
                const item = storeItems.find((i) => i.id === purchase.item_id);
                return (
                  <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{item?.name}</p>
                      <p className="text-sm text-gray-400">Quantity: {purchase.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">{purchase.amount.toLocaleString()} ARK</p>
                      <p className="text-xs text-gray-400">{new Date(purchase.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Proposal Submission */}
        {round2State.active && round2State.proposal_submission_open && !existingProposal && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Final Proposal</h2>
            
            {!proposalSubmitted ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">1. The Problem</label>
                  <textarea
                    value={proposalProblem}
                    onChange={(e) => setProposalProblem(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="What is wrong with your zone?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">2. What We Are Short Of</label>
                  <textarea
                    value={proposalShortage}
                    onChange={(e) => setProposalShortage(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="What resources/capabilities are missing?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">3. What We Bought</label>
                  <textarea
                    value={proposalPurchases}
                    onChange={(e) => setProposalPurchases(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="What did your team purchase?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">4. Build Plan</label>
                  <textarea
                    value={proposalBuildPlan}
                    onChange={(e) => setProposalBuildPlan(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="What will you build?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">5. Timeline</label>
                  <textarea
                    value={proposalTimeline}
                    onChange={(e) => setProposalTimeline(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="When will each step happen?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">6. Financial Plan</label>
                  <textarea
                    value={proposalFinancialPlan}
                    onChange={(e) => setProposalFinancialPlan(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="How much was spent? How much is remaining?"
                  />
                </div>
                
                <button
                  onClick={handleProposalSubmit}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                >
                  Submit Proposal
                </button>
              </div>
            ) : (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                <p className="text-green-400 font-semibold">Proposal Submitted Successfully</p>
                <p className="text-gray-400 text-sm mt-1">Wait for Round 3 to begin</p>
              </div>
            )}
          </div>
        )}
        
        {/* Existing Proposal */}
        {existingProposal && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-green-400">Your Proposal</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">The Problem:</p>
                <p>{existingProposal.problem}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">What We Are Short Of:</p>
                <p>{existingProposal.shortage}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">What We Bought:</p>
                <p>{existingProposal.purchases}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Build Plan:</p>
                <p>{existingProposal.build_plan}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Timeline:</p>
                <p>{existingProposal.timeline}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Financial Plan:</p>
                <p>{existingProposal.financial_plan}</p>
              </div>
              <div className="text-sm text-gray-400 mt-4">
                Submitted: {existingProposal.submitted_at ? new Date(existingProposal.submitted_at).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        )}
        
        {/* Round Not Started */}
        {!round2State.active && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">Round 2 has not started yet</p>
              <p className="text-gray-500 text-sm mt-2">Wait for the Admin to begin the round</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
