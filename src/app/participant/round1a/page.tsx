'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, syncRound1AWithServer } from '@/lib/store';
import { isParticipant, getSavedSession } from '@/lib/auth';
import { standardQuestions } from '@/lib/questions';
import { Question } from '@/types';

const QUESTION_DURATION = 30; // 30 seconds answering timer

export default function ParticipantRound1APage() {
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const teams = useStore((state) => state.teams);
  const wallets = useStore((state) => state.wallets);
  const questions = useStore((state) => state.questions);
  const round1AState = useStore((state) => state.round1AState);
  const scores = useStore((state) => state.scores);
  const submitRound1AAnswer = useStore((state) => state.submitRound1AAnswer);
  const timeoutRound1A = useStore((state) => state.timeoutRound1A);
  const placeRound1ABid = useStore((state) => state.placeRound1ABid);

  // Participant Local State per Question
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(QUESTION_DURATION);
  const [lastQuestionId, setLastQuestionId] = useState<string | undefined>(undefined);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Session check & restoration: NEVER log out on refresh
  useEffect(() => {
    let user = currentUser;
    if (!user) {
      user = getSavedSession('participant');
      if (user && isParticipant(user)) {
        useStore.getState().setCurrentUser(user);
        return;
      }
    }
    if (!user || !isParticipant(user)) {
      router.push('/login');
    }
  }, [currentUser, router]);

  // 2. Real-time synchronization with server for Admin -> Participant flow
  useEffect(() => {
    syncRound1AWithServer();
    const syncInterval = setInterval(() => {
      syncRound1AWithServer();
    }, 400);

    return () => clearInterval(syncInterval);
  }, []);

  const round1AStatus = round1AState?.status || (round1AState?.active ? 'ROUND_STARTED_WAITING' : 'ROUND_NOT_STARTED');

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

  // 3. Navigation guard: If Round 1A is not active or ends, return to Participant Dashboard
  useEffect(() => {
    if (!isRoundActive) {
      router.push('/participant/dashboard');
    }
  }, [isRoundActive, router]);

  const activeUser = currentUser || getSavedSession('participant');
  const myTeamId = activeUser?.team_id;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const myWallet = wallets.find((w) => w.team_id === myTeamId);
  const availableBalance = myWallet ? myWallet.usable_balance : 200000;

  const teamScores = myTeam ? scores.filter((s) => s.team_id === myTeam.id) : [];
  const totalScore = teamScores.reduce((sum, s) => sum + s.marks, 0);

  // Answering team resolution
  const answeringTeam = teams.find((t) => t.id === round1AState.answering_team_id);
  const isMyTeamSelected = Boolean(myTeamId && round1AState.answering_team_id && myTeamId === round1AState.answering_team_id);

  // 4. Resolve current question with options and official correct answer
  const qId = round1AState.current_question_id;
  const qIdx = round1AState.current_question_index;

  const resolvedQuestion: Question | null = (() => {
    if (qIdx !== undefined && qIdx >= 0 && standardQuestions[qIdx]) {
      return standardQuestions[qIdx];
    }
    if (qId) {
      const matchStd = standardQuestions.find((q) => q.id.toLowerCase() === qId.toLowerCase());
      if (matchStd) return matchStd;
      const matchStore = questions.find((q) => q.id.toLowerCase() === qId.toLowerCase());
      if (matchStore) {
        return {
          ...matchStore,
          options: matchStore.options && matchStore.options.length > 0 ? matchStore.options : [
            'Option A', 'Option B', 'Option C', 'Option D'
          ],
        };
      }
    }
    if (isQuestionPhase) {
      return standardQuestions[0];
    }
    return null;
  })();

  const currentOptions: string[] = resolvedQuestion?.options && resolvedQuestion.options.length > 0
    ? resolvedQuestion.options
    : [
        'Option A: First available option',
        'Option B: Second available option',
        'Option C: Third available option',
        'Option D: Fourth available option',
      ];

  // 5. Reset Participant State whenever Admin displays a NEW Question
  useEffect(() => {
    if (round1AState.current_question_id && round1AState.current_question_id !== lastQuestionId) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setSelectedOption(null);
      setTimerRemaining(QUESTION_DURATION);
      setLastQuestionId(round1AState.current_question_id);
      setBidError(null);
      setBidSuccess(null);
    }
  }, [round1AState.current_question_id, lastQuestionId]);

  // Synchronize timer from server when entering ANSWERING_ACTIVE
  useEffect(() => {
    if (round1AState.status === 'ANSWERING_ACTIVE') {
      if (round1AState.answer_timer_remaining > 0) {
        setTimerRemaining(round1AState.answer_timer_remaining);
      }
    }
  }, [round1AState.status, round1AState.answer_timer_remaining]);

  // 6. Countdown Timer Logic during ANSWERING_ACTIVE
  useEffect(() => {
    if (round1AState.status === 'ANSWERING_ACTIVE') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            timeoutRound1A();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [round1AState.status, timeoutRound1A]);

  // Option Selection
  const handleSelectOption = (option: string) => {
    if (round1AState.status === 'ANSWERING_ACTIVE' && isMyTeamSelected) {
      setSelectedOption(option);
    }
  };

  // Submit Answer: Sends answer to Admin, stops timer, transitions to WAITING_FOR_ADMIN_DECISION
  const handleSubmitAnswer = () => {
    if (!selectedOption || !isMyTeamSelected || round1AState.status !== 'ANSWERING_ACTIVE') return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    submitRound1AAnswer(myTeamId!, selectedOption, timerRemaining);
  };

  // Bid submission handler
  const handleBidClick = async (amount: number) => {
    if (!myTeamId || !myTeam) return;
    setBidError(null);
    setBidSuccess(null);

    if (availableBalance < amount) {
      setBidError(`INSUFFICIENT ARK BALANCE (Need ${amount.toLocaleString()} ARK, available: ${availableBalance.toLocaleString()} ARK)`);
      return;
    }

    try {
      setBidLoading(true);
      await placeRound1ABid(myTeamId, myTeam.team_name, myTeam.team_number, amount);
      setBidSuccess(`Bid placed: ${amount.toLocaleString()} ARK!`);
      setTimeout(() => setBidSuccess(null), 3500);
    } catch (err: unknown) {
      setBidError((err as Error).message || 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  if (!activeUser || !isParticipant(activeUser) || !isRoundActive) {
    return null;
  }

  // Phase categorization
  const isPreparationStage =
    round1AStatus === 'PREPARATION_30_SEC' ||
    (round1AStatus === 'QUESTION_DISPLAYED' && (round1AState.prep_timer_remaining ?? 0) > 0);

  const isBiddingOpenStage = round1AStatus === 'BIDDING_OPEN_60_SEC';

  const isBiddingClosedStage =
    round1AStatus === 'BIDDING_CLOSED' ||
    round1AStatus === 'ADMIN_AWARDS_QUESTION' ||
    round1AStatus === 'ADMIN_SELECTS_TEAM';

  const isAnsweringActive = round1AState.status === 'ANSWERING_ACTIVE';
  const isWaitingAdmin =
    round1AState.status === 'WAITING_FOR_ADMIN_DECISION' ||
    round1AState.status === 'ANSWER_SUBMITTED';

  const isEvaluated =
    round1AState.status === 'ANSWER_CORRECT' ||
    round1AState.status === 'ANSWER_WRONG' ||
    round1AState.status === 'TIMES_UP';

  const isPreAwardPhase =
    !round1AState.answering_team_id &&
    (isPreparationStage || isBiddingOpenStage || isBiddingClosedStage || round1AStatus === 'QUESTION_DISPLAYED');

  const displaySelectedOption = selectedOption || round1AState.submitted_answer || null;

  // Bidding dynamic values
  const currentBidAmount = round1AState.current_bid_amount || round1AState.base_bid || 3000;
  const nextBidAmount = round1AState.next_bid_amount || currentBidAmount;
  const isMyTeamLeading = Boolean(myTeamId && round1AState.current_bidder_id === myTeamId);
  const canAffordNextBid = availableBalance >= nextBidAmount;
  const leadBidderName = round1AState.current_bidder_name || (round1AState.current_bidder_id ? `Team ${round1AState.current_bidder_id}` : 'None (Base Bid)');
  const questionBids = round1AState.bids || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-6 py-4 sticky top-0 z-30 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              ARKK
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-base md:text-lg font-semibold text-gray-200">
              Round 1A — Participant Arena
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* AVAILABLE BALANCE Display (Prominently displayed, updates in real time) */}
            <div
              id="participant-available-balance"
              className="px-4 py-2 bg-gradient-to-r from-emerald-950/80 to-gray-900 border border-emerald-500/60 rounded-2xl flex items-center space-x-2.5 shadow-inner"
            >
              <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                AVAILABLE BALANCE:
              </span>
              <span className="text-base md:text-lg font-black text-emerald-400 font-mono">
                {availableBalance.toLocaleString()} ARK
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-100">{myTeam?.team_name || 'Participant Team'}</p>
              <p className="text-xs text-blue-400 font-medium">Team #{myTeam?.team_number || '1'}</p>
            </div>

            {/* Total Points Badge */}
            <div id="score-display" className="px-3.5 py-1.5 bg-gray-800/90 border border-green-500/40 rounded-xl flex items-center space-x-2 shadow-inner">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Score:</span>
              <span className="text-base font-black text-green-400 font-mono">{totalScore} pts</span>
            </div>

            {/* Live Admin Sync Indicator */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Admin Synced</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 md:p-6 max-w-4xl w-full mx-auto flex flex-col justify-center">

        {/* ============================================================ */}
        {/* STATE 1: WAITING FOR QUESTION (Admin has not displayed yet)   */}
        {/* ============================================================ */}
        {(round1AStatus === 'ROUND_STARTED_WAITING' || round1AStatus === 'WAITING_FOR_QUESTION') && (
          <div className="bg-gray-900/80 border border-blue-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-20 -left-20 w-56 h-56 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center space-x-2.5 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                <span className="text-blue-300 font-bold tracking-wider text-xs uppercase">Live Synchronization Active</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                ROUND 1A STARTED
              </h2>

              <p className="text-lg md:text-xl text-gray-300 font-medium max-w-xl mx-auto">
                Waiting for the Admin to display the question…
              </p>

              <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800 text-gray-400 text-sm max-w-md mx-auto">
                <p>The question and 30-second preparation timer will appear immediately once displayed.</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 2: QUESTION DISPLAYED & SUBSEQUENT PHASES               */}
        {/* ============================================================ */}
        {isQuestionPhase && resolvedQuestion && (
          <div className="space-y-6">
            
            {/* Question Card */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              
              {/* Question Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-800">
                <div className="flex items-center space-x-3">
                  <span className="px-3.5 py-1.5 bg-blue-600/20 border border-blue-500/50 text-blue-300 font-mono font-bold rounded-xl text-sm">
                    {`Question ${(round1AState.current_question_index !== undefined && round1AState.current_question_index >= 0) ? round1AState.current_question_index + 1 : (parseInt(resolvedQuestion.id.replace('q_', '')) || 1)}`}
                  </span>
                  <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-xs font-semibold">
                    {resolvedQuestion.category}
                  </span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                    resolvedQuestion.difficulty === 'easy'
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                      : resolvedQuestion.difficulty === 'medium'
                      ? 'bg-amber-950/50 text-amber-300 border-amber-500/40'
                      : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                  }`}>
                    {resolvedQuestion.difficulty}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Value:</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">+{resolvedQuestion.points} pts</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="py-6">
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                  {resolvedQuestion.question_text}
                </h3>
              </div>

              {/* Countdown Timer Display Bar (When answering is active) */}
              {isAnsweringActive && (
                <div
                  id="timer-display"
                  className={`p-4 rounded-2xl flex items-center justify-between shadow-lg border transition-all ${
                    isMyTeamSelected
                      ? 'bg-yellow-950/40 border-yellow-500/60 ring-2 ring-yellow-500/30'
                      : 'bg-gray-950/80 border-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                      <span className="text-xl">⏱️</span>
                    </div>
                    <div>
                      <p className="text-yellow-300 text-sm font-bold">
                        {isMyTeamSelected ? 'Answering Timer Running' : `${answeringTeam?.team_name || 'Selected Team'} is Answering`}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {isMyTeamSelected
                          ? 'Select your answer and click SUBMIT ANSWER before the clock expires.'
                          : 'Please observe. Your team is on standby for the next question.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-yellow-400">
                      TIME REMAINING: {timerRemaining}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* PRE-AWARD PHASES: STAGE 1 (PREPARATION), STAGE 2 (BIDDING),   */}
            {/* STAGE 3 (CLOSED / AWAITING AWARD)                            */}
            {/* ============================================================ */}
            {isPreAwardPhase && (
              <div className="space-y-6">

                {/* STAGE 1 BANNER: 30 SEC QUESTION PREPARATION */}
                {isPreparationStage && (
                  <div
                    id="stage-preparation-banner"
                    className="p-6 bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-gray-900 border-2 border-blue-500/70 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse"
                  >
                    <div className="space-y-1 text-center md:text-left">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/50 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
                        <span>📖</span>
                        <span>Stage 1: Question Viewing & Preparation</span>
                      </div>
                      <h4 className="text-2xl font-black text-white tracking-wide">
                        QUESTION PREPARATION TIME
                      </h4>
                      <p className="text-xs text-gray-300 max-w-md">
                        Review the question and options. Bidding is disabled during preparation and will open automatically in 30 seconds.
                      </p>
                    </div>
                    <div className="text-center md:text-right px-6 py-3 bg-gray-950/80 border border-blue-500/40 rounded-2xl shadow-inner">
                      <span className="text-xs uppercase font-bold text-blue-300 block">Preparation Countdown</span>
                      <span className="text-5xl font-black font-mono text-blue-400 tracking-tight">
                        {round1AState.prep_timer_remaining ?? 30}
                      </span>
                      <span className="text-[10px] text-gray-400 block uppercase">Seconds</span>
                    </div>
                  </div>
                )}

                {/* STAGE 2 BANNER: 60 SEC BIDDING OPEN */}
                {isBiddingOpenStage && (
                  <div
                    id="stage-bidding-open-banner"
                    className="p-6 bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-gray-900 border-2 border-yellow-500/80 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-center md:text-left">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 border border-yellow-400/50 rounded-full text-yellow-300 text-xs font-black uppercase tracking-wider animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                        <span>BIDDING OPEN — STAGE 2</span>
                      </div>
                      <h4 className="text-2xl font-black text-white tracking-wide">
                        QUIZ BIDDING ACTIVE
                      </h4>
                      <p className="text-xs text-gray-300 max-w-md">
                        Click the BID button to claim the increment. First valid click registered by the server wins the lead position.
                      </p>
                    </div>
                    <div className="text-center md:text-right px-6 py-3 bg-gray-950/80 border border-yellow-500/50 rounded-2xl shadow-inner">
                      <span className="text-xs uppercase font-bold text-yellow-400 block">BIDDING TIME LEFT</span>
                      <span className="text-5xl font-black font-mono text-yellow-300 tracking-tight">
                        {round1AState.bidding_timer_remaining ?? 60}
                      </span>
                      <span className="text-[10px] text-gray-400 block uppercase">Seconds Remaining</span>
                    </div>
                  </div>
                )}

                {/* STAGE 3 BANNER: BIDDING CLOSED */}
                {isBiddingClosedStage && (
                  <div
                    id="stage-bidding-closed-banner"
                    className="p-6 bg-gradient-to-r from-rose-950/70 via-gray-900 to-purple-950/70 border-2 border-rose-500/60 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-center md:text-left">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/20 border border-rose-400/50 rounded-full text-rose-300 text-xs font-black uppercase tracking-wider">
                        <span>⏹</span>
                        <span>BIDDING CLOSED — STAGE 3</span>
                      </div>
                      <h4 className="text-2xl font-black text-white tracking-wide">
                        BIDDING PERIOD CONCLUDED
                      </h4>
                      <p className="text-xs text-gray-300 max-w-md">
                        Bids are now frozen. The Admin is reviewing and will award the question to the winning team to begin the answering timer.
                      </p>
                    </div>
                    <div className="text-center md:text-right px-6 py-3 bg-gray-950/80 border border-rose-500/40 rounded-2xl shadow-inner">
                      <span className="text-xs uppercase font-bold text-rose-400 block">Final Status</span>
                      <span className="text-2xl font-black text-white tracking-wide block mt-1">
                        FROZEN
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">Awaiting Admin Award</span>
                    </div>
                  </div>
                )}

                {/* QUIZ BIDDING INTERFACE CARD */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-800">
                    <div>
                      <h4 className="text-lg font-black text-white tracking-wide uppercase">
                        Round 1A Quiz Bidding
                      </h4>
                      <p className="text-xs text-gray-400">
                        {resolvedQuestion.difficulty.toUpperCase()} question · Base Bid: {round1AState.base_bid?.toLocaleString() || (resolvedQuestion.difficulty === 'hard' ? '10,000' : resolvedQuestion.difficulty === 'medium' ? '5,000' : '3,000')} ARK · Increment: +{round1AState.bid_increment?.toLocaleString() || (resolvedQuestion.difficulty === 'hard' ? '5,000' : resolvedQuestion.difficulty === 'medium' ? '3,000' : '2,000')} ARK
                      </p>
                    </div>

                    {/* Prominent Balance in Bidding Card */}
                    <div className="px-3.5 py-1.5 bg-gray-950 border border-emerald-500/50 rounded-xl flex items-center space-x-2">
                      <span className="text-[11px] text-gray-400 font-semibold uppercase">Your Balance:</span>
                      <span className="text-sm md:text-base font-black text-emerald-400 font-mono">
                        {availableBalance.toLocaleString()} ARK
                      </span>
                    </div>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Current Available Balance */}
                    <div className="p-4 bg-gray-950/80 rounded-2xl border border-gray-800 shadow-inner">
                      <span className="text-[11px] uppercase font-bold text-gray-400 block">
                        CURRENT AVAILABLE BALANCE
                      </span>
                      <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 block mt-1">
                        {availableBalance.toLocaleString()} ARK
                      </span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">Central Server State</span>
                    </div>

                    {/* Current Quiz Bid Amount */}
                    <div className="p-4 bg-gray-950/80 rounded-2xl border border-yellow-500/40 shadow-inner">
                      <span className="text-[11px] uppercase font-bold text-gray-400 block">
                        CURRENT QUIZ BID AMOUNT
                      </span>
                      <span className="text-xl md:text-2xl font-black font-mono text-yellow-400 block mt-1">
                        {currentBidAmount.toLocaleString()} ARK
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {round1AState.current_bidder_id ? `Bidder: ${leadBidderName}` : 'Base Opening Bid'}
                      </span>
                    </div>

                    {/* Next Valid Bid / Winning Bidder */}
                    <div className="p-4 bg-gray-950/80 rounded-2xl border border-purple-500/40 shadow-inner">
                      <span className="text-[11px] uppercase font-bold text-gray-400 block">
                        {isBiddingClosedStage ? 'FINAL LEAD BIDDER' : 'NEXT VALID BID'}
                      </span>
                      {isBiddingClosedStage ? (
                        <span className="text-lg md:text-xl font-black text-purple-300 block mt-1 truncate">
                          {leadBidderName}
                        </span>
                      ) : (
                        <span className="text-xl md:text-2xl font-black font-mono text-purple-300 block mt-1">
                          {nextBidAmount.toLocaleString()} ARK
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {isMyTeamLeading ? '★ Your team holds lead' : isBiddingClosedStage ? 'Frozen final bidder' : 'Next increment to claim'}
                      </span>
                    </div>
                  </div>

                  {/* Bidding Action Controls */}
                  <div className="space-y-3 pt-2">
                    {isPreparationStage ? (
                      <button
                        id="participant-bid-btn"
                        disabled
                        className="w-full py-4 px-4 bg-gray-800/80 border border-gray-700 text-gray-400 rounded-2xl font-black text-base md:text-lg uppercase tracking-wider cursor-not-allowed shadow-inner flex flex-col items-center justify-center"
                      >
                        <span>BIDDING OPENS IN {round1AState.prep_timer_remaining ?? 30}s</span>
                        <span className="text-xs font-normal text-gray-500 mt-0.5">
                          Buttons are disabled during the 30-second preparation phase.
                        </span>
                      </button>
                    ) : isBiddingClosedStage ? (
                      <button
                        id="participant-bid-btn"
                        disabled
                        className="w-full py-4 px-4 bg-gray-800/80 border border-rose-500/30 text-rose-300 rounded-2xl font-black text-base md:text-lg uppercase tracking-wider cursor-not-allowed shadow-inner flex flex-col items-center justify-center"
                      >
                        <span>BIDDING CLOSED</span>
                        <span className="text-xs font-normal text-gray-400 mt-0.5">
                          Final Bid: {currentBidAmount.toLocaleString()} ARK ({leadBidderName}). Awaiting Admin award.
                        </span>
                      </button>
                    ) : (
                      <button
                        id="participant-bid-btn"
                        disabled={!canAffordNextBid || isMyTeamLeading || bidLoading}
                        onClick={() => handleBidClick(nextBidAmount)}
                        className={`w-full py-4 px-4 rounded-2xl font-black text-base md:text-lg tracking-wider transition-all flex flex-col items-center justify-center shadow-xl border ${
                          isMyTeamLeading
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 cursor-default shadow-emerald-900/30'
                            : !canAffordNextBid
                            ? 'bg-gray-900 border-rose-600/50 text-rose-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-black border-yellow-400 cursor-pointer active:scale-[0.99] shadow-yellow-500/30'
                        }`}
                      >
                        <span>
                          {bidLoading
                            ? 'SUBMITTING BID…'
                            : isMyTeamLeading
                            ? `✓ YOUR TEAM IS THE LEAD BIDDER (${currentBidAmount.toLocaleString()} ARK)`
                            : !canAffordNextBid
                            ? 'INSUFFICIENT ARK BALANCE'
                            : `BID ${nextBidAmount.toLocaleString()} ARK`}
                        </span>
                        <span className="text-xs font-normal opacity-85 mt-0.5">
                          {isMyTeamLeading
                            ? 'Holding lead position. Another team must bid to continue the sequence.'
                            : !canAffordNextBid
                            ? `Requires ${nextBidAmount.toLocaleString()} ARK (Available: ${availableBalance.toLocaleString()} ARK)`
                            : `Click to become the current bidder at ${nextBidAmount.toLocaleString()} ARK`}
                        </span>
                      </button>
                    )}

                    {/* Feedback Alerts */}
                    {bidError && (
                      <div className="p-3 bg-rose-950/70 border border-rose-500 text-rose-200 text-xs font-bold rounded-xl flex items-center space-x-2">
                        <span>⚠️</span>
                        <span>{bidError}</span>
                      </div>
                    )}
                    {bidSuccess && (
                      <div className="p-3 bg-emerald-950/70 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl flex items-center space-x-2">
                        <span>✓</span>
                        <span>{bidSuccess}</span>
                      </div>
                    )}
                  </div>

                  {/* Live Bids Feed */}
                  {questionBids.length > 0 && (
                    <div className="pt-3 border-t border-gray-800 space-y-2">
                      <span className="text-[11px] uppercase font-bold text-gray-400 block">
                        Live Bidding History (Current Question):
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {questionBids.map((bid) => (
                          <div
                            key={bid.id}
                            className="flex items-center justify-between p-2 bg-gray-950/70 rounded-xl border border-gray-800 text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">
                                {bid.team_name || bid.team_id}
                              </span>
                              {bid.team_id === myTeamId && (
                                <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded-full font-semibold">
                                  Your Team
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-black text-yellow-400">
                              {bid.bid_amount.toLocaleString()} ARK
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Options Preview Grid (Allows viewing during 30s prep & bidding) */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">📋</span>
                      <h4 className="text-base font-bold text-gray-200 tracking-wide uppercase">
                        Question Options Preview
                      </h4>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                      Study Options
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {currentOptions.map((opt, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      return (
                        <div
                          key={index}
                          className="p-4 md:p-5 rounded-2xl border border-gray-800 bg-gray-950/60 text-gray-200 flex items-center justify-between shadow-sm transition-all hover:border-gray-700"
                        >
                          <div className="flex items-center space-x-3.5">
                            <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold font-mono text-sm flex items-center justify-center flex-shrink-0">
                              {optionLetter}
                            </span>
                            <span className="text-sm md:text-base font-medium leading-snug">
                              {opt}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 2 & 3: ANSWERING ACTIVE (Admin awarded question)        */}
            {/* If Selected: Shows YOUR TEAM HAS BEEN SELECTED + Options + SUBMIT */}
            {/* If NOT Selected: Shows TEAM A IS ANSWERING                   */}
            {/* ============================================================ */}
            {isAnsweringActive && (
              <>
                {isMyTeamSelected ? (
                  // SELECTED TEAM INTERFACE
                  <div className="bg-gray-900/90 border-2 border-yellow-500/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">🎯</span>
                        <h4 className="text-xl font-extrabold text-yellow-300 tracking-wide">
                          YOUR TEAM HAS BEEN SELECTED
                        </h4>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-xs font-bold rounded-full uppercase animate-pulse">
                          Answering Enabled
                        </span>
                        {round1AState.award_amount && (
                          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold rounded-full">
                            Spent: {round1AState.award_amount.toLocaleString()} ARK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-3.5">
                      {currentOptions.map((opt, index) => {
                        const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                        const isSelected = selectedOption === opt;

                        return (
                          <div
                            key={index}
                            id={`option-${optionLetter}-btn`}
                            onClick={() => handleSelectOption(opt)}
                            className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-md ${
                              isSelected
                                ? 'bg-yellow-500/20 border-yellow-400 text-white ring-2 ring-yellow-400/50 shadow-yellow-500/20'
                                : 'bg-gray-950/60 border-gray-800 text-gray-200 hover:border-yellow-500/40 hover:bg-gray-900/80'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <span className={`w-9 h-9 rounded-xl font-bold font-mono text-base flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-yellow-400 text-black font-black'
                                  : 'bg-gray-800 border border-gray-700 text-gray-300'
                              }`}>
                                {optionLetter}
                              </span>
                              <span className="text-base font-semibold leading-relaxed">
                                {opt}
                              </span>
                            </div>
                            <span className="text-xl">
                              {isSelected ? '🔘' : '⚪'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Submit Button */}
                    <button
                      id="participant-submit-answer-btn"
                      onClick={handleSubmitAnswer}
                      disabled={!selectedOption}
                      className={`w-full py-4 text-lg font-black rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 ${
                        selectedOption
                          ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 cursor-pointer transform active:scale-[0.99]'
                          : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <span>🚀</span>
                      <span>
                        {selectedOption ? `SUBMIT SELECTED ANSWER (${selectedOption.slice(0, 30)}…)` : 'CHOOSE AN OPTION ABOVE TO SUBMIT'}
                      </span>
                    </button>
                  </div>
                ) : (
                  // NON-SELECTED TEAM OBSERVATION INTERFACE
                  <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-4 backdrop-blur-sm">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-semibold uppercase">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                      <span>Answering Phase Active</span>
                    </div>

                    <h4 className="text-2xl font-bold text-white">
                      {answeringTeam?.team_name || 'Another Team'} is Answering
                    </h4>
                    {round1AState.award_amount && (
                      <p className="text-xs text-yellow-300 font-mono">
                        Winning Bid: {round1AState.award_amount.toLocaleString()} ARK
                      </p>
                    )}
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                      Please observe the session. If this team fails to answer in time or answers incorrectly, the Admin will advance the round.
                    </p>

                    {/* Disabled Preview of Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-4">
                      {currentOptions.map((opt, idx) => (
                        <div key={idx} className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl text-left text-xs text-gray-400">
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============================================================ */}
            {/* STEP 4: ANSWER SUBMITTED — WAITING FOR ADMIN DECISION        */}
            {/* ============================================================ */}
            {isWaitingAdmin && (
              <div className="bg-gray-900/90 border-2 border-purple-500/50 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping"></span>
                    <h4 className="text-xl font-bold text-purple-300">
                      ANSWER SUBMITTED — WAITING FOR ADMIN DECISION
                    </h4>
                  </div>
                  <span className="px-3 py-1 bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs font-bold rounded-full uppercase">
                    Admin Reviewing
                  </span>
                </div>

                <div className="p-4 bg-gray-950/80 rounded-2xl border border-gray-800 space-y-2">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                    {isMyTeamSelected ? 'Your Team’s Submission:' : `${answeringTeam?.team_name || 'Answering Team'}’s Submission:`}
                  </span>
                  <p className="text-lg font-bold text-white">
                    {displaySelectedOption || 'Answer submitted'}
                  </p>
                </div>

                <div className="p-4 bg-purple-950/40 border border-purple-800/50 rounded-2xl text-center space-y-1">
                  <p className="text-sm font-semibold text-purple-200">
                    The Admin is currently reviewing and scoring this answer.
                  </p>
                  <p className="text-xs text-gray-400">
                    Points will be evaluated when the Admin clicks CORRECT or WRONG.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 5: EVALUATION RESULTS (Admin decided CORRECT or WRONG)  */}
            {/* ============================================================ */}
            {isEvaluated && (
              <div className="space-y-6">
                
                {/* CORRECT RESULT */}
                {round1AState.status === 'ANSWER_CORRECT' && (
                  <div id="evaluation-result" className="p-6 md:p-8 bg-emerald-950/70 border-2 border-emerald-500 rounded-3xl shadow-2xl space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">🎉</span>
                      <div>
                        <h4 className="text-3xl font-black text-emerald-300 tracking-tight">CORRECT!</h4>
                        <p className="text-emerald-100 text-base font-medium">
                          {isMyTeamSelected
                            ? `Great job! Your team has been awarded +${resolvedQuestion.points} points.`
                            : `${answeringTeam?.team_name || 'The answering team'} was awarded +${resolvedQuestion.points} points.`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200">
                      <span>Submitted Answer: {displaySelectedOption}</span>
                      <span className="font-mono font-bold text-sm">Your Team Score: {totalScore} pts</span>
                    </div>
                  </div>
                )}

                {/* WRONG RESULT */}
                {round1AState.status === 'ANSWER_WRONG' && (
                  <div id="evaluation-result" className="p-6 md:p-8 bg-rose-950/70 border-2 border-rose-500 rounded-3xl shadow-2xl space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">❌</span>
                      <div>
                        <h4 className="text-3xl font-black text-rose-300 tracking-tight">WRONG ANSWER</h4>
                        <p className="text-rose-100 text-base font-medium">
                          {isMyTeamSelected
                            ? 'Your answer was marked wrong. 0 points awarded.'
                            : `${answeringTeam?.team_name || 'The answering team'} was marked wrong. 0 points awarded.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-950/80 rounded-xl border border-rose-800/60 space-y-1">
                      <p className="text-xs text-rose-300 font-semibold uppercase tracking-wider">Official Correct Answer:</p>
                      <p className="text-sm font-bold text-white">{resolvedQuestion.correct_answer}</p>
                    </div>
                  </div>
                )}

                {/* TIME'S UP RESULT */}
                {round1AState.status === 'TIMES_UP' && (
                  <div id="evaluation-result" className="p-6 md:p-8 bg-amber-950/70 border-2 border-amber-500 rounded-3xl shadow-2xl space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">⏰</span>
                      <div>
                        <h4 className="text-3xl font-black text-amber-300 tracking-tight">TIME’S UP</h4>
                        <p className="text-amber-100 text-base font-medium">
                          The answering clock expired before submission. 0 points awarded.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-950/80 rounded-xl border border-amber-800/60 space-y-1">
                      <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Official Correct Answer:</p>
                      <p className="text-sm font-bold text-white">{resolvedQuestion.correct_answer}</p>
                    </div>
                  </div>
                )}

                {/* Waiting for Admin to click NEXT QUESTION */}
                <div className="p-5 bg-gray-950/80 border border-blue-500/40 rounded-2xl text-center space-y-2">
                  <div className="inline-flex items-center space-x-2 text-blue-400 font-semibold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                    <span>Waiting for Admin to click NEXT QUESTION…</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Please remain on this screen. As soon as the Admin displays the next question, it will appear automatically.
                  </p>
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
