'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, syncRound1AWithServer } from '@/lib/store';
import { isAdmin, getSavedSession } from '@/lib/auth';
import { standardQuestions } from '@/lib/questions';

export default function AdminRound1APage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const questions = useStore((state) => state.questions);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const round1AState = useStore((state) => state.round1AState);
  const eventState = useStore((state) => state.eventState);
  
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bidAmount, setBidAmount] = useState('5000');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const updateRound1AState = useStore((state) => state.updateRound1AState);
  const updateEventState = useStore((state) => state.updateEventState);
  const updateQuestion = useStore((state) => state.updateQuestion);
  const startRound1A = useStore((state) => state.startRound1A);
  const displayQuestion = useStore((state) => state.displayQuestion);
  const nextQuestion = useStore((state) => state.nextQuestion);
  const endRound1A = useStore((state) => state.endRound1A);
  const deductBalance = useStore((state) => state.deductBalance);
  const addScore = useStore((state) => state.addScore);
  const addAuditLog = useStore((state) => state.addAuditLog);
  const store = useStore();
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (round1AState.answer_timer_running && round1AState.answer_timer_remaining > 0) {
      interval = setInterval(() => {
        useStore.setState((state) => {
          const newRemaining = state.round1AState.answer_timer_remaining - 1;
          if (newRemaining <= 0) {
            return {
              round1AState: {
                ...state.round1AState,
                answer_timer_running: false,
                answer_timer_remaining: 0,
                status: state.round1AState.status === 'ANSWERING_ACTIVE' ? 'TIMES_UP' : state.round1AState.status,
                evaluation_result: state.round1AState.status === 'ANSWERING_ACTIVE' ? 'times_up' : state.round1AState.evaluation_result,
              },
            };
          }
          return {
            round1AState: {
              ...state.round1AState,
              answer_timer_remaining: newRemaining,
            },
          };
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [round1AState.answer_timer_running, round1AState.answer_timer_remaining]);
  
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

  // Periodic server sync for multi-browser / multi-tab synchronization
  useEffect(() => {
    syncRound1AWithServer();
    const interval = setInterval(() => {
      syncRound1AWithServer();
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  const activeUser = currentUser || getSavedSession('admin');
  if (!activeUser || !isAdmin(activeUser)) {
    return null;
  }
  
  const qId = round1AState.current_question_id;
  const qIdx = round1AState.current_question_index;
  const currentQuestion =
    (qIdx !== undefined && qIdx >= 0 && standardQuestions[qIdx]) ||
    (qId ? standardQuestions.find((q) => q.id.toLowerCase() === qId.toLowerCase()) : null) ||
    (qId ? questions.find((q) => q.id.toLowerCase() === qId.toLowerCase()) : null);

  const pendingQuestions = questions.length > 0 ? questions.filter((q) => q.status === 'pending') : standardQuestions;
  const activeTeams = teams.filter((t) => t.active && !t.eliminated);
  const round1AStatus = round1AState?.status || (round1AState?.active ? (round1AState?.current_question_id ? 'QUESTION_DISPLAYED' : 'ROUND_STARTED_WAITING') : 'ROUND_NOT_STARTED');
  const isQuestionPhase =
    round1AStatus === 'QUESTION_DISPLAYED' ||
    round1AStatus === 'PREPARATION_30_SEC' ||
    round1AStatus === 'BIDDING_OPEN_60_SEC' ||
    round1AStatus === 'BIDDING_CLOSED' ||
    round1AStatus === 'ADMIN_AWARDS_QUESTION' ||
    round1AStatus === 'ADMIN_SELECTS_TEAM' ||
    round1AStatus === 'ANSWERING_ACTIVE' ||
    round1AStatus === 'ANSWER_SUBMITTED' ||
    round1AStatus === 'WAITING_FOR_ADMIN_DECISION' ||
    round1AStatus === 'ADMIN_MARKS_CORRECT_OR_WRONG' ||
    round1AStatus === 'ANSWER_CORRECT' ||
    round1AStatus === 'ANSWER_WRONG' ||
    round1AStatus === 'TIMES_UP' ||
    round1AStatus === 'WAIT_FOR_ADMIN_NEXT_QUESTION';

  const isRoundActive =
    round1AStatus === 'ROUND_STARTED_WAITING' ||
    round1AStatus === 'WAITING_FOR_QUESTION' ||
    round1AStatus === 'NEXT_QUESTION' ||
    isQuestionPhase;

  // Auto-sync winning bidder and bid amount to Admin award controls
  useEffect(() => {
    if (round1AState.current_bidder_id) {
      setSelectedTeamId(round1AState.current_bidder_id);
    }
    if (round1AState.current_bid_amount) {
      setBidAmount(String(round1AState.current_bid_amount));
    }
  }, [round1AState.current_bidder_id, round1AState.current_bid_amount]);
  
  const handleStartRound = () => {
    startRound1A();
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'START_ROUND_1A',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleDisplayQuestion = (questionId?: string) => {
    let targetId = questionId || selectedQuestionId;
    if (!targetId && pendingQuestions.length > 0) {
      targetId = pendingQuestions[0].id;
    }
    if (!targetId) {
      targetId = 'q_01';
    }
    
    displayQuestion(targetId);
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'DISPLAY_QUESTION',
      new_value: targetId,
      timestamp: new Date().toISOString(),
    });
    
    setSelectedQuestionId('');
  };
  
  const handleNextQuestionClick = () => {
    if (selectedQuestionId) {
      nextQuestion(selectedQuestionId);
      setSelectedQuestionId('');
    } else {
      nextQuestion();
    }
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'NEXT_QUESTION',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleEndRoundClick = () => {
    setShowEndConfirm(true);
  };
  
  const confirmEndRound = () => {
    endRound1A();
    setShowEndConfirm(false);
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      action: 'END_ROUND_1A',
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleAwardQuestion = (teamIdToAward?: string) => {
    const targetTeamId = teamIdToAward || selectedTeamId;
    if (!targetTeamId || !round1AState.current_question_id) {
      alert('Please select a team to award the answer.');
      return;
    }
    
    const amount = parseInt(bidAmount || '5000') || 5000;
    const wallet = wallets.find((w) => w.team_id === targetTeamId);
    
    if (!wallet || wallet.usable_balance < amount) {
      alert(`Team has insufficient balance (${wallet?.usable_balance.toLocaleString() || 0} ARK available).`);
      return;
    }
    
    try {
      store.awardRound1AQuestion(targetTeamId, amount, 30);
      
      updateEventState({ current_activity: `Question awarded to Team ${teams.find((t) => t.id === targetTeamId)?.team_number || targetTeamId}` });
      
      addAuditLog({
        id: `log_${Date.now()}`,
        user_id: activeUser.id,
        team_id: targetTeamId,
        action: 'AWARD_QUESTION',
        new_value: `${round1AState.current_question_id} - ${amount} ARK`,
        timestamp: new Date().toISOString(),
      });
      
      setShowConfirm(false);
      setSelectedTeamId(targetTeamId);
    } catch (error) {
      alert('Error awarding question: ' + (error as Error).message);
    }
  };
  
  const confirmAward = () => {
    handleAwardQuestion();
  };
  
  const handleMarkCorrect = () => {
    if (!round1AState.answering_team_id || !round1AState.current_question_id) return;
    const teamId = round1AState.answering_team_id;
    const points = currentQuestion?.points || 10;
    
    store.evaluateRound1AAnswer(true);
    
    updateEventState({ current_activity: 'Answer marked correct - Ready for next question' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      team_id: teamId,
      action: 'CORRECT_ANSWER',
      new_value: `${points} points`,
      timestamp: new Date().toISOString(),
    });
  };
  
  const handleMarkWrong = () => {
    if (!round1AState.answering_team_id || !round1AState.current_question_id) return;
    const teamId = round1AState.answering_team_id;
    
    store.evaluateRound1AAnswer(false);
    
    updateEventState({ current_activity: 'Answer marked wrong - Ready for next question' });
    
    addAuditLog({
      id: `log_${Date.now()}`,
      user_id: activeUser.id,
      team_id: teamId,
      action: 'WRONG_ANSWER',
      timestamp: new Date().toISOString(),
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-400">ARKK</h1>
            <span className="text-gray-400">|</span>
            <span className="text-xl">Admin Control — Round 1A</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              round1AStatus === 'ROUND_ENDED' ? 'bg-green-600/30 text-green-400 border border-green-500' :
              isRoundActive ? 'bg-blue-600/30 text-blue-400 border border-blue-500 animate-pulse' :
              'bg-gray-700 text-gray-300'
            }`}>
              {round1AStatus.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-400 hover:text-white text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ============================================================ */}
        {/* 1. ROUND LIFECYCLE CONTROL                                   */}
        {/* ============================================================ */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Round 1A Lifecycle</h2>
              <p className="text-sm text-gray-400">
                Single Source of Truth: Participants reflect this state in real-time.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {(round1AStatus === 'ROUND_NOT_STARTED' || round1AStatus === 'NOT_STARTED') && (
                <button
                  onClick={handleStartRound}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
                >
                  <span>▶</span>
                  <span>Start Round 1A</span>
                </button>
              )}
              
              {(round1AStatus === 'ROUND_STARTED_WAITING' || round1AStatus === 'WAITING_FOR_QUESTION') && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDisplayQuestion()}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-xl shadow-emerald-600/40 transition-all flex items-center space-x-2 text-base border-2 border-emerald-400/60 animate-pulse"
                  >
                    <span>📢</span>
                    <span>Display Question {selectedQuestionId ? `(${selectedQuestionId})` : (pendingQuestions[0]?.id ? `(${pendingQuestions[0].id})` : '(q_01)')}</span>
                  </button>
                  <button
                    onClick={handleNextQuestionClick}
                    className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 text-sm"
                  >
                    <span>⏭</span>
                    <span>Next Question</span>
                  </button>
                  <button
                    onClick={handleEndRoundClick}
                    className="px-4 py-2.5 bg-red-600/80 hover:bg-red-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 text-sm"
                  >
                    <span>⏹</span>
                    <span>End Round</span>
                  </button>
                </div>
              )}

              {isQuestionPhase && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleNextQuestionClick}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
                  >
                    <span>⏭</span>
                    <span>Next Question</span>
                  </button>
                  <button
                    onClick={handleEndRoundClick}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
                  >
                    <span>⏹</span>
                    <span>End Round 1A</span>
                  </button>
                </div>
              )}
              
              {round1AStatus === 'ROUND_ENDED' && (
                <div className="flex items-center space-x-3">
                  <span className="px-4 py-2 bg-green-900/40 border border-green-600 text-green-300 rounded-xl text-sm font-semibold">
                    ✓ Round 1A Completed
                  </span>
                  <button
                    onClick={() => router.push('/admin/round1b')}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Go to Round 1B →
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Alert Banner */}
          <div className="mt-4 pt-4 border-t border-gray-700/60 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Current Activity:</span>
              <span className="font-semibold text-white">{eventState.current_activity}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Participant View:</span>
              <span className="text-blue-400 font-mono">
                {(round1AStatus === 'ROUND_STARTED_WAITING' || round1AStatus === 'WAITING_FOR_QUESTION')
                  ? '“Waiting for the question to be displayed…”'
                  : isQuestionPhase
                  ? `Question ${currentQuestion?.id || ''} active (${round1AStatus.replace(/_/g, ' ')})`
                  : round1AStatus === 'ROUND_ENDED'
                  ? 'Dashboard (Round Concluded)'
                  : 'Dashboard / Not Started'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. ACTIVE QUESTION MONITOR & CONTROLS                       */}
        {/* ============================================================ */}
        {isQuestionPhase && currentQuestion && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-blue-500/40 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold rounded-lg text-sm">
                  {currentQuestion.id}
                </span>
                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                  {currentQuestion.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                  currentQuestion.difficulty === 'easy' ? 'bg-green-600/30 text-green-300' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-600/30 text-yellow-300' :
                  'bg-red-600/30 text-red-300'
                }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className="text-green-400 font-bold">{currentQuestion.points} Points</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleNextQuestionClick}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1"
                >
                  <span>⏭ Next Question</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Question Displayed to Participants</p>
              <h3 className="text-2xl font-bold text-white leading-relaxed">{currentQuestion.question_text}</h3>
              <div className="mt-3 p-3 bg-gray-900/60 rounded-xl border border-gray-700/80">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Official Correct Answer: </span>
                <span className="text-green-400 font-semibold">{currentQuestion.correct_answer}</span>
              </div>

              {/* Options Grid for Admin */}
              {currentQuestion.options && currentQuestion.options.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isCorrect =
                      opt === currentQuestion.correct_answer ||
                      opt.trim().startsWith(currentQuestion.correct_answer.trim().charAt(0) + '.');
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isCorrect
                            ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200 font-semibold ring-1 ring-emerald-500/30'
                            : 'bg-gray-900/80 border-gray-700/80 text-gray-300'
                        }`}
                      >
                        <span className="leading-snug">{opt}</span>
                        {isCorrect && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-full font-bold uppercase flex-shrink-0 ml-2">
                            ✓ Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Synchronized Stage Status & Timing */}
            <div className="p-4 bg-gray-900/90 rounded-2xl border border-blue-500/50 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-full ${
                  round1AState.status === 'PREPARATION_30_SEC' ? 'bg-blue-400 animate-ping' :
                  round1AState.status === 'BIDDING_OPEN_60_SEC' ? 'bg-yellow-400 animate-ping' :
                  round1AState.status === 'BIDDING_CLOSED' ? 'bg-rose-400' :
                  'bg-emerald-400'
                }`}></span>
                <div>
                  <span className="text-xs uppercase font-bold text-gray-400 block">Question Stage:</span>
                  <span className="text-base font-black text-white">
                    {round1AState.status === 'PREPARATION_30_SEC' ? 'STAGE 1: PREPARATION (30 SEC)' :
                     round1AState.status === 'BIDDING_OPEN_60_SEC' ? 'STAGE 2: BIDDING OPEN (60 SEC)' :
                     round1AState.status === 'BIDDING_CLOSED' ? 'STAGE 3: BIDDING CLOSED' :
                     round1AState.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                {round1AState.status === 'PREPARATION_30_SEC' && (
                  <div className="text-right">
                    <span className="text-xs text-blue-300 uppercase block font-semibold">Prep Countdown</span>
                    <span className="text-2xl font-black font-mono text-blue-400">{round1AState.prep_timer_remaining ?? 30}s</span>
                  </div>
                )}
                {round1AState.status === 'BIDDING_OPEN_60_SEC' && (
                  <div className="text-right">
                    <span className="text-xs text-yellow-300 uppercase block font-semibold">Bidding Time Left</span>
                    <span className="text-2xl font-black font-mono text-yellow-400">{round1AState.bidding_timer_remaining ?? 60}s</span>
                  </div>
                )}
                {round1AState.status === 'BIDDING_CLOSED' && (
                  <div className="text-right">
                    <span className="text-xs text-rose-300 uppercase block font-semibold">Bidding Status</span>
                    <span className="text-sm font-black text-rose-400 uppercase">Frozen / Closed</span>
                  </div>
                )}

                <div className="text-right border-l border-gray-700 pl-4">
                  <span className="text-xs text-gray-400 uppercase block font-semibold">Current Lead Bid</span>
                  <span className="text-lg font-black font-mono text-yellow-400">
                    {(round1AState.current_bid_amount || round1AState.base_bid || 3000).toLocaleString()} ARK
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {round1AState.current_bidder_id
                      ? `Bidder: ${teams.find((t) => t.id === round1AState.current_bidder_id)?.team_name || round1AState.current_bidder_name || round1AState.current_bidder_id}`
                      : 'No bids yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Bids Feed for Admin */}
            {round1AState.bids && round1AState.bids.length > 0 && (
              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-700 space-y-2">
                <span className="text-xs uppercase font-bold text-gray-400 block">
                  Live Question Bids Stream:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {round1AState.bids.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 bg-gray-800/80 rounded-lg border border-gray-700">
                      <span className="font-semibold text-white">{b.team_name || b.team_id}</span>
                      <span className="font-mono font-black text-yellow-400">{b.bid_amount.toLocaleString()} ARK</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bidding Control */}
            {/* STEP 2 & STEP 3: Admin Selects Team & Clicks Award Answer */}
            {(!round1AState.answering_team_id || round1AState.status === 'QUESTION_DISPLAYED' || round1AState.status === 'PREPARATION_30_SEC' || round1AState.status === 'BIDDING_OPEN_60_SEC' || round1AState.status === 'BIDDING_CLOSED') && (
              <div className="p-5 bg-gray-900/70 rounded-2xl border-2 border-yellow-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <div>
                    <h4 className="text-lg font-black text-yellow-300 tracking-wide uppercase">
                      Select Team & Award Answer
                    </h4>
                    <p className="text-xs text-gray-400">
                      {round1AState.current_bidder_id
                        ? `Winning bidder from auction is automatically pre-selected. Click AWARD ANSWER to start the answering timer.`
                        : `Choose the answering team and click AWARD ANSWER to activate their answering interface.`}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-900/40 border border-yellow-500/50 text-yellow-300 text-xs font-bold rounded-full uppercase">
                    Admin Only Control
                  </span>
                </div>

                {/* Clickable Team Selection Grid */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    SELECT TEAM
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeTeams.map((t) => {
                      const wallet = wallets.find((w) => w.team_id === t.id);
                      const isSelected = selectedTeamId === t.id;
                      const isLeadBidder = round1AState.current_bidder_id === t.id;
                      return (
                        <div
                          key={t.id}
                          id={`team-select-${t.id}`}
                          onClick={() => setSelectedTeamId(t.id)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-600/30 border-blue-500 ring-2 ring-blue-500/60 shadow-lg shadow-blue-600/20'
                              : isLeadBidder
                              ? 'bg-yellow-950/40 border-yellow-500/80 hover:bg-yellow-900/40'
                              : 'bg-gray-800/80 border-gray-700 hover:border-blue-400 hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-sm">{t.team_name}</span>
                            <span className="text-xs text-blue-400 font-semibold">#{t.team_number}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-green-400">
                              {wallet?.usable_balance.toLocaleString() || 0} ARK
                            </span>
                            {isLeadBidder && (
                              <span className="text-[10px] text-yellow-300 font-bold px-1.5 py-0.2 bg-yellow-500/20 rounded">
                                Lead
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team Dropdown & Bid Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                      Selected Team (Dropdown)
                    </label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Team to Answer --</option>
                      {activeTeams.map((t) => {
                        const wallet = wallets.find((w) => w.team_id === t.id);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.team_name} (Team #{t.team_number}) — {wallet?.usable_balance.toLocaleString()} ARK
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                      Award / Bid Amount (ARK)
                    </label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="5000"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  id="admin-award-answer-btn"
                  onClick={() => handleAwardQuestion()}
                  disabled={!selectedTeamId}
                  className={`w-full py-4 font-extrabold text-lg rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2 ${
                    selectedTeamId
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/30 cursor-pointer transform active:scale-[0.99]'
                      : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xl">⚡</span>
                  <span>
                    {selectedTeamId
                      ? `AWARD ANSWER TO ${teams.find((t) => t.id === selectedTeamId)?.team_name.toUpperCase()} (${parseInt(bidAmount || '0').toLocaleString()} ARK)`
                      : 'SELECT A TEAM ABOVE TO AWARD ANSWER'}
                  </span>
                </button>
              </div>
            )}

            {/* Answer Evaluation Section */}
            {round1AState.answering_team_id && (
              <div className="p-5 bg-gray-900/60 rounded-xl border border-green-600/40 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-700/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Answering Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    round1AState.status === 'ANSWER_CORRECT' ? 'bg-green-600/30 text-green-400 border border-green-500' :
                    round1AState.status === 'ANSWER_WRONG' ? 'bg-red-600/30 text-red-400 border border-red-500' :
                    round1AState.status === 'TIMES_UP' ? 'bg-amber-600/30 text-amber-400 border border-amber-500' :
                    round1AState.status === 'WAITING_FOR_ADMIN_DECISION' || round1AState.status === 'ANSWER_SUBMITTED' ? 'bg-purple-600/30 text-purple-300 border border-purple-500 animate-pulse' :
                    round1AState.status === 'ANSWERING_ACTIVE' ? 'bg-blue-600/30 text-blue-400 border border-blue-500 animate-pulse' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {round1AState.status === 'WAITING_FOR_ADMIN_DECISION' ? 'WAITING FOR ADMIN DECISION' : round1AState.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-700">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Answering Team</p>
                    <p className="text-xl font-bold text-white">
                      {teams.find((t) => t.id === round1AState.answering_team_id)?.team_name}
                      {round1AState.award_amount ? ` (Bid: ${round1AState.award_amount.toLocaleString()} ARK)` : ''}
                    </p>
                  </div>
                  {round1AState.answer_timer_running && (
                    <div className="text-right">
                      <span className="text-xs text-gray-400 uppercase tracking-wider block">Time Remaining</span>
                      <span className="text-3xl font-black text-yellow-400 font-mono">
                        {round1AState.answer_timer_remaining}s
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-Time Submitted Answer */}
                <div className="p-4 bg-gray-800/80 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Participant Live Submission:
                    </span>
                    {(round1AState.status === 'WAITING_FOR_ADMIN_DECISION' || round1AState.submitted_answer) && (
                      <span className="px-2.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-bold rounded-full animate-pulse">
                        ANSWER SUBMITTED — WAITING FOR ADMIN DECISION
                      </span>
                    )}
                  </div>
                  {round1AState.submitted_answer ? (
                    <div className="p-3 bg-gray-900/90 rounded-lg border-2 border-green-500/50">
                      <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Submitted Answer:</span>
                      <p className="text-lg text-white font-bold">
                        {round1AState.submitted_answer}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-400 italic py-2">
                      Waiting for participant to submit their answer...
                    </p>
                  )}
                </div>

                {/* Admin Decision Controls */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Admin Decision Controls:
                  </p>
                  <div className="flex space-x-4">
                    <button
                      id="admin-correct-btn"
                      onClick={handleMarkCorrect}
                      className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-600/30 transition-all text-lg flex items-center justify-center space-x-2 cursor-pointer transform active:scale-[0.99]"
                    >
                      <span>✓</span>
                      <span>CORRECT (+{currentQuestion.points} pts)</span>
                    </button>
                    <button
                      id="admin-wrong-btn"
                      onClick={handleMarkWrong}
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/30 transition-all text-lg flex items-center justify-center space-x-2 cursor-pointer transform active:scale-[0.99]"
                    >
                      <span>✗</span>
                      <span>WRONG (0 pts)</span>
                    </button>
                  </div>
                </div>

                {/* Evaluation Result Banners */}
                {round1AState.status === 'ANSWER_CORRECT' && (
                  <div className="p-4 bg-emerald-950/70 border border-emerald-500 rounded-xl text-emerald-200 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-400 text-base block">✓ Marked CORRECT</span>
                      <span>Score updated in real time (+{currentQuestion.points} pts credited to answering team).</span>
                    </div>
                    <button
                      onClick={handleNextQuestionClick}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                    >
                      Next Question →
                    </button>
                  </div>
                )}

                {round1AState.status === 'ANSWER_WRONG' && (
                  <div className="p-4 bg-rose-950/70 border border-rose-500 rounded-xl text-rose-200 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-400 text-base block">✗ Marked WRONG</span>
                      <span>0 points credited. Waiting for Next Question.</span>
                    </div>
                    <button
                      onClick={handleNextQuestionClick}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                    >
                      Next Question →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. QUESTION SELECTION GRID (When waiting or choosing next)   */}
        {/* ============================================================ */}
        {(round1AStatus === 'WAITING_FOR_QUESTION' || isRoundActive) && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Question Repository</h3>
                <p className="text-xs text-gray-400">
                  {(round1AStatus === 'ROUND_STARTED_WAITING' || round1AStatus === 'WAITING_FOR_QUESTION')
                    ? 'Select a question and click Display Question to show it to all participants.'
                    : 'You can choose the next question to display when ready.'}
                </p>
              </div>

              {selectedQuestionId ? (
                <button
                  onClick={() => handleDisplayQuestion()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2"
                >
                  <span>📢</span>
                  <span>Display Selected ({selectedQuestionId}) →</span>
                </button>
              ) : pendingQuestions.length > 0 ? (
                <button
                  onClick={() => handleDisplayQuestion(pendingQuestions[0].id)}
                  className="px-5 py-2.5 bg-gray-700 hover:bg-emerald-600 text-gray-200 hover:text-white font-bold rounded-xl shadow transition-all flex items-center space-x-2 text-sm"
                >
                  <span>📢</span>
                  <span>Display First Pending ({pendingQuestions[0].id}) →</span>
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {pendingQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedQuestionId === q.id
                      ? 'bg-blue-600/30 border-blue-500 shadow-md ring-2 ring-blue-500/50'
                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-sm text-blue-400">{q.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        q.difficulty === 'easy' ? 'bg-green-900/60 text-green-300' :
                        q.difficulty === 'medium' ? 'bg-yellow-900/60 text-yellow-300' :
                        'bg-red-900/60 text-red-300'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 line-clamp-2 mb-2">{q.question_text}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/60 text-xs">
                    <span className="text-gray-400">{q.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400 font-bold">{q.points} pts</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisplayQuestion(q.id);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow text-xs transition-colors"
                      >
                        Display →
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingQuestions.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-500">
                  All questions for Round 1A have been answered or displayed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. TEAM BALANCES OVERVIEW                                    */}
        {/* ============================================================ */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Participant Standings & Balances</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700 pb-2">
                  <th className="py-2.5">Team</th>
                  <th className="py-2.5">Usable ARK</th>
                  <th className="py-2.5">Round 1A Score</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTeams.map((team) => {
                  const wallet = wallets.find((w) => w.team_id === team.id);
                  const roundScore = useStore.getState().getTeamRoundScore(team.id, 1);
                  const isAnswering = round1AState.answering_team_id === team.id;
                  return (
                    <tr
                      key={team.id}
                      className={`border-b border-gray-700/40 transition-colors ${
                        isAnswering ? 'bg-blue-900/30' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <td className="py-3 font-medium">
                        {team.team_name} (Team {team.team_number})
                        {isAnswering && (
                          <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/40">
                            Active Answering
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-green-400">{wallet?.usable_balance.toLocaleString()} ARK</td>
                      <td className="py-3 font-bold text-white">{roundScore} pts</td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded-full">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Awarding Question */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Award Question</h3>
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to {confirmAction}? This will deduct the bid amount from their ARK wallet immediately.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmAward}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
              >
                Confirm Award
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Ending Round 1A */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-red-500/50 shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-2">End Round 1A?</h3>
            <p className="text-gray-300 text-sm mb-6">
              This will officially close Round 1A. All participant screens will immediately transition to “ROUND 1A COMPLETED”, unlocking their navigation to the dashboard and Round 1B.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmEndRound}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
              >
                End Round 1A
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
