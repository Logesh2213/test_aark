import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Team,
  Wallet,
  Transaction,
  Question,
  QuestionBid,
  Zone,
  ZoneTransaction,
  ZoneBid,
  Resource,
  TeamResource,
  StoreItem,
  Purchase,
  Round2Wave,
  Round2Submission,
  Proposal,
  Video,
  Deal,
  Score,
  AuditLog,
  EventState,
  Round1AState,
  Round1BState,
  Round2State,
  Round3State,
  Round4State,
  Round5State,
  Round6State,
} from '@/types';
import { standardQuestions } from './questions';
import { officialZones } from './zones';

function getInitialWallets(): Wallet[] {
  const list: Wallet[] = [];
  for (let i = 1; i <= 25; i++) {
    list.push({
      team_id: `team_${String(i).padStart(2, '0')}`,
      usable_balance: 200000,
      frozen_balance: 50000,
    });
  }
  return list;
}

interface AppState {
  reset_epoch: number;

  // Users & Auth
  users: User[];
  currentUser: User | null;
  
  // Teams
  teams: Team[];
  
  // Wallets
  wallets: Wallet[];
  
  // Transactions
  transactions: Transaction[];
  
  // Questions
  questions: Question[];
  questionBids: QuestionBid[];
  
  // Zones
  zones: Zone[];
  zoneTransactions: ZoneTransaction[];
  
  // Resources
  resources: Resource[];
  teamResources: TeamResource[];
  
  // Store
  storeItems: StoreItem[];
  purchases: Purchase[];
  
  // Round 2
  round2Waves: Round2Wave[];
  round2Submissions: Round2Submission[];
  proposals: Proposal[];
  
  // Round 3
  videos: Video[];
  
  // Round 5
  deals: Deal[];
  
  // Scores
  scores: Score[];
  
  // Audit Logs
  auditLogs: AuditLog[];
  
  // Event State
  eventState: EventState;
  round1AState: Round1AState;
  round1BState: Round1BState;
  round2State: Round2State;
  round3State: Round3State;
  round4State: Round4State;
  round5State: Round5State;
  round6State: Round6State;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  resetAllData: () => void;
  applyServerReset: (epoch?: number) => void;
  addTeam: (team: Team) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  addWallet: (wallet: Wallet) => void;
  updateWallet: (teamId: string, updates: Partial<Wallet>) => void;
  addTransaction: (transaction: Transaction) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (questionId: string, updates: Partial<Question>) => void;
  addQuestionBid: (bid: QuestionBid) => void;
  addZone: (zone: Zone) => void;
  updateZone: (zoneId: string, updates: Partial<Zone>) => void;
  addZoneTransaction: (transaction: ZoneTransaction) => void;
  addResource: (resource: Resource) => void;
  updateTeamResource: (teamId: string, resourceId: string, quantity: number) => void;
  addStoreItem: (item: StoreItem) => void;
  updateStoreItem: (itemId: string, updates: Partial<StoreItem>) => void;
  addPurchase: (purchase: Purchase) => void;
  addRound2Wave: (wave: Round2Wave) => void;
  updateRound2Wave: (waveId: string, updates: Partial<Round2Wave>) => void;
  addRound2Submission: (submission: Round2Submission) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (proposalId: string, updates: Partial<Proposal>) => void;
  addVideo: (video: Video) => void;
  updateVideo: (videoId: string, updates: Partial<Video>) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (dealId: string, updates: Partial<Deal>) => void;
  addScore: (score: Score) => void;
  updateScore: (scoreId: string, updates: Partial<Score>) => void;
  addAuditLog: (log: AuditLog) => void;
  updateEventState: (updates: Partial<EventState>) => void;
  updateRound1AState: (updates: Partial<Round1AState>) => void;
  startRound1A: () => void;
  displayQuestion: (questionId: string) => void;
  nextQuestion: (nextQuestionId?: string) => void;
  endRound1A: () => void;
  awardRound1AQuestion: (teamId: string, amount: number, duration?: number) => void;
  placeRound1ABid: (teamId: string, teamName: string, teamNumber: number, amount: number) => Promise<void>;
  submitRound1AAnswer: (teamId: string, answer: string, timerRemaining?: number) => void;
  evaluateRound1AAnswer: (isCorrect: boolean) => void;
  timeoutRound1A: () => void;
  updateRound1BState: (updates: Partial<Round1BState>) => void;
  startRound1B: () => void;
  endRound1B: () => void;
  startZoneAuction: (zoneId: string) => void;
  placeZoneBid: (teamId: string, zoneId: string, amount: number) => void;
  stopZoneBidding: () => void;
  awardZoneToTeam: (zoneId: string, teamId: string, amount: number) => void;
  unlockRound1BFrozenBalance: () => void;
  updateRound2State: (updates: Partial<Round2State>) => void;
  updateRound3State: (updates: Partial<Round3State>) => void;
  updateRound4State: (updates: Partial<Round4State>) => void;
  updateRound5State: (updates: Partial<Round5State>) => void;
  updateRound6State: (updates: Partial<Round6State>) => void;
  setTeamRoundScore: (teamId: string, round: number, marks: number, category?: string) => Promise<void>;
  setBatchTeamRoundScores: (batch: Array<{ team_id: string; round: number; marks: number; category?: string }>) => Promise<void>;
  
  // Helper functions
  getTeamByUserId: (userId: string) => Team | undefined;
  getWalletByTeamId: (teamId: string) => Wallet | undefined;
  getTeamScore: (teamId: string) => number;
  getTeamRoundScore: (teamId: string, round: number) => number;
  deductBalance: (teamId: string, amount: number, description: string, round: number) => void;
  addBalance: (teamId: string, amount: number, description: string, round: number) => void;
  releaseFrozenBalance: (teamId: string) => void;
}

const initialEventState: EventState = {
  current_round: 0,
  current_activity: 'Event not started',
  timer_running: false,
  timer_duration: 0,
  timer_remaining: 0,
  leaderboard_visible: false,
  event_status: 'not_started',
};

const initialRound1AState: Round1AState = {
  active: false,
  status: 'ROUND_NOT_STARTED',
  current_question_index: -1,
  current_question_id: undefined,
  current_question_text: undefined,
  current_question_category: undefined,
  current_question_difficulty: undefined,
  current_question_points: undefined,
  bidding_open: false,
  answering_team_id: undefined,
  submitted_answer: undefined,
  answer_timer_running: false,
  answer_timer_remaining: 0,
};

const initialRound1BState: Round1BState = {
  active: false,
  frozen_unlocked: false,
  zone_study_mode: true,
  current_auction_zone_id: undefined,
  auction_open: false,
  auction_status: 'idle',
  current_bid_amount: undefined,
  current_bidder_id: undefined,
  current_bidder_name: undefined,
  current_bidder_number: undefined,
  next_bid_amount: undefined,
  bids: [],
};

const initialRound2State: Round2State = {
  active: false,
  frozen_released: false,
  wave_active: false,
  store_open: false,
  proposal_submission_open: false,
};

const initialRound3State: Round3State = {
  active: false,
  upload_deadline: '',
  max_file_size: 100,
};

const initialRound4State: Round4State = {
  active: false,
  scoring_open: false,
};

const initialRound5State: Round5State = {
  active: false,
  negotiation_open: false,
};

const initialRound6State: Round6State = {
  active: false,
  scoring_open: false,
};

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('arkk_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.role) return parsed;
    }
  } catch (e) {}
  return null;
};

let realtimeBroadcastChannel: BroadcastChannel | null = null;

export const useStore = create<AppState>()(
  persist<AppState>(
    (set, get) => ({
      // Initial state
      reset_epoch: 0,
      users: [],
      currentUser: getInitialUser(),
      teams: [],
      wallets: [],
      transactions: [],
      questions: standardQuestions.map((q) => ({ ...q })),
      questionBids: [],
      zones: [],
      zoneTransactions: [],
      resources: [],
      teamResources: [],
      storeItems: [],
      purchases: [],
      round2Waves: [],
      round2Submissions: [],
      proposals: [],
      videos: [],
      deals: [],
      scores: [],
      auditLogs: [],
      eventState: initialEventState,
      round1AState: initialRound1AState,
      round1BState: initialRound1BState,
      round2State: initialRound2State,
      round3State: initialRound3State,
      round4State: initialRound4State,
      round5State: initialRound5State,
      round6State: initialRound6State,
      
      // Actions
      setCurrentUser: (user) => set({ currentUser: user }),

      applyServerReset: (epoch?: number) => {
        const newEpoch = epoch || Date.now();
        set((state) => ({
          reset_epoch: newEpoch,
          eventState: initialEventState,
          round1AState: initialRound1AState,
          round1BState: initialRound1BState,
          round2State: initialRound2State,
          round3State: initialRound3State,
          round4State: initialRound4State,
          round5State: initialRound5State,
          round6State: initialRound6State,
          questions: standardQuestions.map((q) => ({ ...q })),
          questionBids: [],
          zones: officialZones.map((z) => ({ ...z })),
          zoneTransactions: [],
          resources: state.resources.length > 0 ? state.resources : [],
          teamResources: [],
          purchases: [],
          round2Submissions: [],
          proposals: [],
          videos: [],
          deals: [],
          scores: [],
          auditLogs: [],
          wallets: getInitialWallets(),
        }));
      },
      
      resetAllData: () => {
        const newEpoch = Date.now();
        get().applyServerReset(newEpoch);
        if (typeof window !== 'undefined') {
          fetch('/api/reset', {
            method: 'POST',
          }).catch(() => {});

          try {
            if (realtimeBroadcastChannel) {
              realtimeBroadcastChannel.postMessage({
                type: 'RESET_ALL_DATA',
                epoch: newEpoch,
              });
            }
          } catch (e) {}
        }
      },
      
      addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),
      
      updateTeam: (teamId, updates) => set((state) => ({
        teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)),
      })),
      
      addWallet: (wallet) => set((state) => ({ wallets: [...state.wallets, wallet] })),
      
      updateWallet: (teamId, updates) => set((state) => ({
        wallets: state.wallets.map((w) => (w.team_id === teamId ? { ...w, ...updates } : w)),
      })),
      
      addTransaction: (transaction) => set((state) => ({ transactions: [...state.transactions, transaction] })),
      
      addQuestion: (question) => set((state) => ({ questions: [...state.questions, question] })),
      
      updateQuestion: (questionId, updates) => set((state) => ({
        questions: state.questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
      })),
      
      addQuestionBid: (bid) => set((state) => ({ questionBids: [...state.questionBids, bid] })),
      
      addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
      
      updateZone: (zoneId, updates) => set((state) => ({
        zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
      })),
      
      addZoneTransaction: (transaction) => set((state) => ({ zoneTransactions: [...state.zoneTransactions, transaction] })),
      
      addResource: (resource) => set((state) => ({ resources: [...state.resources, resource] })),
      
      updateTeamResource: (teamId, resourceId, quantity) => set((state) => {
        const existingIndex = state.teamResources.findIndex(
          (tr) => tr.team_id === teamId && tr.resource_id === resourceId
        );
        
        if (existingIndex >= 0) {
          const updated = [...state.teamResources];
          updated[existingIndex] = { ...updated[existingIndex], quantity };
          return { teamResources: updated };
        }
        
        return {
          teamResources: [...state.teamResources, { team_id: teamId, resource_id: resourceId, quantity }],
        };
      }),
      
      addStoreItem: (item) => set((state) => ({ storeItems: [...state.storeItems, item] })),
      
      updateStoreItem: (itemId, updates) => set((state) => ({
        storeItems: state.storeItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
      })),
      
      addPurchase: (purchase) => set((state) => ({ purchases: [...state.purchases, purchase] })),
      
      addRound2Wave: (wave) => set((state) => ({ round2Waves: [...state.round2Waves, wave] })),
      
      updateRound2Wave: (waveId, updates) => set((state) => ({
        round2Waves: state.round2Waves.map((w) => (w.id === waveId ? { ...w, ...updates } : w)),
      })),
      
      addRound2Submission: (submission) => set((state) => ({ round2Submissions: [...state.round2Submissions, submission] })),
      
      addProposal: (proposal) => set((state) => ({ proposals: [...state.proposals, proposal] })),
      
      updateProposal: (proposalId, updates) => set((state) => ({
        proposals: state.proposals.map((p) => (p.id === proposalId ? { ...p, ...updates } : p)),
      })),
      
      addVideo: (video) => set((state) => ({ videos: [...state.videos, video] })),
      
      updateVideo: (videoId, updates) => set((state) => ({
        videos: state.videos.map((v) => (v.id === videoId ? { ...v, ...updates } : v)),
      })),
      
      addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),
      
      updateDeal: (dealId, updates) => set((state) => ({
        deals: state.deals.map((d) => (d.id === dealId ? { ...d, ...updates } : d)),
      })),
      
      addScore: (score) => set((state) => ({ scores: [...state.scores, score] })),
      
      updateScore: (scoreId, updates) => set((state) => ({
        scores: state.scores.map((s) => (s.id === scoreId ? { ...s, ...updates } : s)),
      })),

      setTeamRoundScore: async (teamId: string, round: number, marks: number, category?: string) => {
        const cat = category || `Round ${round}`;
        set((state) => {
          const existingIdx = state.scores.findIndex((s) => s.team_id === teamId && s.round === round);
          let updatedScores: Score[];
          if (existingIdx >= 0) {
            updatedScores = [...state.scores];
            updatedScores[existingIdx] = {
              ...updatedScores[existingIdx],
              marks,
              category: cat,
            };
          } else {
            updatedScores = [
              ...state.scores,
              {
                id: `score_${teamId}_r${round}_${Date.now()}`,
                team_id: teamId,
                round,
                category: cat,
                marks,
              },
            ];
          }
          return { scores: updatedScores };
        });

        if (typeof window !== 'undefined') {
          try {
            await fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'SET_SCORE',
                payload: { team_id: teamId, round, marks, category: cat },
              }),
            });
          } catch (e) {
            // ignore network error
          }
        }
      },

      setBatchTeamRoundScores: async (batch) => {
        set((state) => {
          const updatedScores = [...state.scores];
          for (const item of batch) {
            const cat = item.category || `Round ${item.round}`;
            const existingIdx = updatedScores.findIndex((s) => s.team_id === item.team_id && s.round === item.round);
            if (existingIdx >= 0) {
              updatedScores[existingIdx] = {
                ...updatedScores[existingIdx],
                marks: item.marks,
                category: cat,
              };
            } else {
              updatedScores.push({
                id: `score_${item.team_id}_r${item.round}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                team_id: item.team_id,
                round: item.round,
                category: cat,
                marks: item.marks,
              });
            }
          }
          return { scores: updatedScores };
        });

        if (typeof window !== 'undefined') {
          try {
            await fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'SET_BATCH_SCORES',
                payload: { batch },
              }),
            });
          } catch (e) {
            // ignore network error
          }
        }
      },
      
      addAuditLog: (log) => set((state) => ({ auditLogs: [...state.auditLogs, log] })),
      
      updateEventState: (updates) => set((state) => ({
        eventState: { ...state.eventState, ...updates },
      })),
      
      updateRound1AState: (updates) => set((state) => ({
        round1AState: { ...state.round1AState, ...updates },
      })),
      
      startRound1A: () => {
        set((state) => ({
          round1AState: {
            ...state.round1AState,
            active: true,
            status: 'ROUND_STARTED_WAITING',
            current_question_index: -1,
            current_question_id: undefined,
            current_question_text: undefined,
            current_question_category: undefined,
            current_question_difficulty: undefined,
            current_question_points: undefined,
            bidding_open: false,
            answering_team_id: undefined,
            submitted_answer: undefined,
            answer_timer_running: false,
            answer_timer_remaining: 0,
          },
          eventState: {
            ...state.eventState,
            current_round: 1,
            current_activity: 'Round 1A - Waiting for Question',
            event_status: 'in_progress',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'START_ROUND' }),
          }).catch(() => {});
        }
      },
      
      displayQuestion: (questionId) => {
        let index = -1;
        if (questionId) {
          index = standardQuestions.findIndex(
            (q) => q.id.toLowerCase() === questionId.toLowerCase()
          );
        }
        if (index === -1) {
          index = 0;
        }
        const q = standardQuestions[index] || standardQuestions[0];

        set((state) => ({
          questions: state.questions.map((item) =>
            item.id.toLowerCase() === q.id.toLowerCase() ? { ...item, status: 'active' } : item
          ),
          round1AState: {
            ...state.round1AState,
            active: true,
            status: 'QUESTION_DISPLAYED',
            current_question_index: index,
            current_question_id: q.id,
            current_question_text: q.question_text,
            current_question_category: q.category,
            current_question_difficulty: q.difficulty,
            current_question_points: q.points,
            bidding_open: true,
            answering_team_id: undefined,
            submitted_answer: undefined,
            answer_timer_running: false,
            answer_timer_remaining: 0,
            answer_timer_end_time: undefined,
            evaluation_result: undefined,
            award_amount: undefined,
          },
          eventState: {
            ...state.eventState,
            current_round: 1,
            current_activity: `Question ${q.id} - Active`,
            event_status: 'in_progress',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DISPLAY_QUESTION',
              payload: { questionId: q.id },
            }),
          }).catch(() => {});
        }
      },
      
      nextQuestion: (nextQuestionId) => {
        const currentIdx = get().round1AState.current_question_index ?? -1;
        let nextIndex = -1;

        if (nextQuestionId) {
          nextIndex = standardQuestions.findIndex(
            (q) => q.id.toLowerCase() === nextQuestionId.toLowerCase()
          );
        }

        if (nextIndex === -1) {
          if (currentIdx >= 0) {
            nextIndex = currentIdx + 1;
          } else {
            const curId = get().round1AState.current_question_id;
            if (curId) {
              const fIdx = standardQuestions.findIndex(
                (q) => q.id.toLowerCase() === curId.toLowerCase()
              );
              nextIndex = fIdx >= 0 ? fIdx + 1 : 0;
            } else {
              nextIndex = 0;
            }
          }
        }

        const nextQ = standardQuestions[nextIndex];
        const currentId = get().round1AState.current_question_id;

        if (nextQ) {
          set((state) => ({
            questions: state.questions.map((q) => {
              if (currentId && q.id.toLowerCase() === currentId.toLowerCase()) {
                return { ...q, status: 'completed' };
              }
              if (q.id.toLowerCase() === nextQ.id.toLowerCase()) {
                return { ...q, status: 'active' };
              }
              return q;
            }),
            round1AState: {
              ...state.round1AState,
              active: true,
              status: 'QUESTION_DISPLAYED',
              current_question_index: nextIndex,
              current_question_id: nextQ.id,
              current_question_text: nextQ.question_text,
              current_question_category: nextQ.category,
              current_question_difficulty: nextQ.difficulty,
              current_question_points: nextQ.points,
              bidding_open: true,
              answering_team_id: undefined,
              submitted_answer: undefined,
              answer_timer_running: false,
              answer_timer_remaining: 0,
              answer_timer_end_time: undefined,
              evaluation_result: undefined,
              award_amount: undefined,
            },
            eventState: {
              ...state.eventState,
              current_round: 1,
              current_activity: `Question ${nextQ.id} - Active`,
            },
          }));
        } else {
          set((state) => ({
            round1AState: {
              ...state.round1AState,
              status: 'ROUND_STARTED_WAITING',
              current_question_index: -1,
              current_question_id: undefined,
              current_question_text: undefined,
              current_question_category: undefined,
              current_question_difficulty: undefined,
              current_question_points: undefined,
              bidding_open: false,
              answering_team_id: undefined,
              submitted_answer: undefined,
              answer_timer_running: false,
              answer_timer_remaining: 0,
              answer_timer_end_time: undefined,
              evaluation_result: undefined,
              award_amount: undefined,
            },
            eventState: {
              ...state.eventState,
              current_activity: 'All questions completed - Ready to End Round 1A',
            },
          }));
        }

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'NEXT_QUESTION',
              payload: { questionId: nextQuestionId },
            }),
          }).catch(() => {});
        }
      },
      
      endRound1A: () => {
        set((state) => ({
          round1AState: {
            ...state.round1AState,
            active: false,
            status: 'ROUND_ENDED',
            current_question_index: -1,
            current_question_id: undefined,
            current_question_text: undefined,
            current_question_category: undefined,
            current_question_difficulty: undefined,
            current_question_points: undefined,
            bidding_open: false,
            answering_team_id: undefined,
            submitted_answer: undefined,
            answer_timer_running: false,
            answer_timer_remaining: 0,
          },
          eventState: {
            ...state.eventState,
            current_activity: 'Round 1A Completed',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'END_ROUND' }),
          }).catch(() => {});
        }
      },
      
      awardRound1AQuestion: (teamId, amount, duration = 30) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet || wallet.usable_balance < amount) {
          throw new Error('Team has insufficient balance');
        }

        const qId = get().round1AState.current_question_id || 'q';
        get().deductBalance(teamId, amount, `Question bid - ${qId}`, 1);

        const endTime = Date.now() + duration * 1000;

        set((state) => ({
          round1AState: {
            ...state.round1AState,
            active: true,
            status: 'ANSWERING_ACTIVE',
            bidding_open: false,
            answering_team_id: teamId,
            submitted_answer: undefined,
            answer_timer_running: true,
            answer_timer_remaining: duration,
            answer_timer_end_time: endTime,
            award_amount: amount,
            evaluation_result: undefined,
          },
          eventState: {
            ...state.eventState,
            current_activity: `Question awarded to Team - Answering active`,
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'AWARD_QUESTION',
              payload: { teamId, amount, duration },
            }),
          }).catch(() => {});
        }
      },

      placeRound1ABid: async (teamId, teamName, teamNumber, amount) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet || wallet.usable_balance < amount) {
          throw new Error('INSUFFICIENT ARK BALANCE');
        }

        const res = await fetch('/api/round1a', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'PLACE_BID',
            payload: { teamId, teamName, teamNumber, amount },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to place bid');
        }

        if (data.round1AState) {
          set((state) => ({
            round1AState: {
              ...state.round1AState,
              ...data.round1AState,
            },
          }));
        }
      },
      
      submitRound1AAnswer: (teamId, answer, timerRemaining = 0) => {
        set((state) => ({
          round1AState: {
            ...state.round1AState,
            status: 'WAITING_FOR_ADMIN_DECISION',
            submitted_answer: answer,
            answer_timer_running: false,
            answer_timer_remaining: timerRemaining,
            answer_timer_end_time: undefined,
            evaluation_result: undefined,
          },
          eventState: {
            ...state.eventState,
            current_activity: `Answer submitted - Waiting for Admin decision`,
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SUBMIT_ANSWER',
              payload: { teamId, answer, timerRemaining },
            }),
          }).catch(() => {});
        }
      },

      evaluateRound1AAnswer: (isCorrect: boolean) => {
        const answeringTeamId = get().round1AState.answering_team_id;
        const qId = get().round1AState.current_question_id;
        const qIdx = get().round1AState.current_question_index;
        
        let points = 10;
        if (qIdx !== undefined && qIdx >= 0 && standardQuestions[qIdx]) {
          points = standardQuestions[qIdx].points || 10;
        } else if (qId) {
          const matchedQ = get().questions.find((q) => q.id.toLowerCase() === qId.toLowerCase()) || standardQuestions.find((q) => q.id.toLowerCase() === qId.toLowerCase());
          if (matchedQ) points = matchedQ.points || 10;
        }

        let newScoreObj: Score | null = null;
        if (isCorrect && answeringTeamId) {
          newScoreObj = {
            id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            team_id: answeringTeamId,
            round: 1,
            category: 'Round 1A',
            marks: points,
          };
          get().addScore(newScoreObj);
        }

        const newStatus = isCorrect ? 'ANSWER_CORRECT' : 'ANSWER_WRONG';

        set((state) => ({
          round1AState: {
            ...state.round1AState,
            status: newStatus,
            answer_timer_running: false,
            answer_timer_remaining: 0,
            answer_timer_end_time: undefined,
            evaluation_result: isCorrect ? 'correct' : 'wrong',
          },
          eventState: {
            ...state.eventState,
            current_activity: isCorrect ? 'Answer marked CORRECT - Ready for next question' : 'Answer marked WRONG - Ready for next question',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'EVALUATE_ANSWER',
              payload: { isCorrect, teamId: answeringTeamId, points: isCorrect ? points : 0, score: newScoreObj },
            }),
          }).catch(() => {});
        }
      },

      timeoutRound1A: () => {
        set((state) => ({
          round1AState: {
            ...state.round1AState,
            status: 'TIMES_UP',
            answer_timer_running: false,
            answer_timer_remaining: 0,
            answer_timer_end_time: undefined,
            evaluation_result: 'times_up',
          },
          eventState: {
            ...state.eventState,
            current_activity: `Time's up for current question`,
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1a', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'TIME_OUT' }),
          }).catch(() => {});
        }
      },
      
      updateRound1BState: (updates) => set((state) => ({
        round1BState: { ...state.round1BState, ...updates },
      })),

      startRound1B: () => {
        const state = get();
        // Unlock frozen 50,000 for each team ONCE
        let updatedWallets = state.wallets;
        if (!state.round1BState.frozen_unlocked) {
          updatedWallets = state.wallets.map((w) => {
            const frozen = w.frozen_balance || 0;
            return {
              ...w,
              usable_balance: w.usable_balance + frozen,
              frozen_balance: 0,
            };
          });
        }

        set((s) => ({
          wallets: updatedWallets,
          round1BState: {
            ...s.round1BState,
            active: true,
            frozen_unlocked: true,
            zone_study_mode: true,
            auction_open: false,
            current_auction_zone_id: undefined,
          },
          eventState: {
            ...s.eventState,
            current_round: 1,
            current_activity: 'Round 1B - Zone Study & Auction Active',
            event_status: 'in_progress',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'START_ROUND_1B' }),
          }).catch(() => {});
        }
      },

      endRound1B: () => {
        set((state) => ({
          zones: state.zones.map((z) =>
            z.status === 'auction_active' ? { ...z, status: 'available' } : z
          ),
          round1BState: {
            ...state.round1BState,
            active: false,
            auction_open: false,
            current_auction_zone_id: undefined,
            zone_study_mode: false,
          },
          eventState: {
            ...state.eventState,
            current_activity: 'Round 1B Completed',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'END_ROUND_1B' }),
          }).catch(() => {});
        }
      },

      unlockRound1BFrozenBalance: () => {
        const state = get();
        if (state.round1BState.frozen_unlocked) return;
        const updatedWallets = state.wallets.map((w) => {
          const frozen = w.frozen_balance || 0;
          return {
            ...w,
            usable_balance: w.usable_balance + frozen,
            frozen_balance: 0,
          };
        });
        set((s) => ({
          wallets: updatedWallets,
          round1BState: {
            ...s.round1BState,
            frozen_unlocked: true,
          },
        }));
      },

      startZoneAuction: (zoneId: string) => {
        const zone = get().zones.find((z) => z.id === zoneId);
        if (!zone) return;

        const initialBid = zone.starting_price;
        const nextIncrementBid = initialBid + 5000;

        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === zoneId
              ? { ...z, status: 'auction_active' }
              : z.status === 'auction_active'
              ? { ...z, status: 'available' }
              : z
          ),
          round1BState: {
            ...state.round1BState,
            current_auction_zone_id: zoneId,
            auction_open: true,
            auction_status: 'bidding_active',
            zone_study_mode: false,
            current_bid_amount: initialBid,
            current_bidder_id: undefined,
            current_bidder_name: undefined,
            current_bidder_number: undefined,
            next_bid_amount: nextIncrementBid,
            bids: [],
          },
          eventState: {
            ...state.eventState,
            current_round: 1,
            current_activity: `Live Auction: Zone ${zone.zone_number} — ${zone.name}`,
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'START_AUCTION',
              payload: { zoneId },
            }),
          }).catch(() => {});
        }
      },

      placeZoneBid: (teamId: string, zoneId: string, amount: number) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet || wallet.usable_balance < amount) {
          throw new Error('Insufficient bidding balance');
        }

        const team = get().teams.find((t) => t.id === teamId);
        const serverTime = new Date().toISOString();
        const existingBids = get().round1BState.bids || [];
        const newBid: ZoneBid = {
          id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          zone_id: zoneId,
          team_id: teamId,
          team_name: team?.team_name || `Team ${String(team?.team_number || 1).padStart(2, '0')}`,
          team_number: team?.team_number || 1,
          amount,
          sequence: existingBids.length + 1,
          timestamp: serverTime,
          server_timestamp: serverTime,
        };

        set((state) => ({
          round1BState: {
            ...state.round1BState,
            current_bid_amount: amount,
            current_bidder_id: teamId,
            current_bidder_name: team?.team_name || `Team ${String(team?.team_number || 1).padStart(2, '0')}`,
            current_bidder_number: team?.team_number || 1,
            next_bid_amount: amount + 5000,
            bids: [newBid, ...(state.round1BState.bids || [])],
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'PLACE_BID',
              payload: {
                teamId,
                teamName: team?.team_name,
                teamNumber: team?.team_number,
                amount,
                zoneId,
              },
            }),
          }).catch(() => {});
        }
      },

      stopZoneBidding: () => {
        set((state) => ({
          round1BState: {
            ...state.round1BState,
            auction_open: false,
            auction_status: 'bidding_stopped',
          },
          eventState: {
            ...state.eventState,
            current_activity: 'Bidding Stopped — Admin deciding winning team award',
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'STOP_BIDDING' }),
          }).catch(() => {});
        }
      },

      awardZoneToTeam: (zoneId: string, teamId: string, amount: number) => {
        const zone = get().zones.find((z) => z.id === zoneId);
        if (!zone) throw new Error('Zone not found');

        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet || wallet.usable_balance < amount) {
          throw new Error('Team has insufficient balance');
        }

        get().deductBalance(teamId, amount, `Zone purchase - ${zone.name}`, 1);

        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === zoneId
              ? {
                  ...z,
                  status: 'sold',
                  owner_team_id: teamId,
                  winning_bid: amount,
                  purchase_price: amount,
                  final_value: amount,
                }
              : z
          ),
          round1BState: {
            ...state.round1BState,
            current_auction_zone_id: undefined,
            auction_open: false,
            auction_status: 'zone_awarded',
            zone_study_mode: true,
            current_bid_amount: undefined,
            current_bidder_id: undefined,
            current_bidder_name: undefined,
            current_bidder_number: undefined,
            next_bid_amount: undefined,
          },
          eventState: {
            ...state.eventState,
            current_activity: `Zone ${zone.zone_number} awarded to Team ${
              state.teams.find((t) => t.id === teamId)?.team_number || ''
            }`,
          },
        }));

        if (typeof window !== 'undefined') {
          fetch('/api/round1b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'AWARD_ZONE',
              payload: { zoneId, teamId, finalPrice: amount },
            }),
          }).catch(() => {});
        }
      },
      
      updateRound2State: (updates) => set((state) => ({
        round2State: { ...state.round2State, ...updates },
      })),
      
      updateRound3State: (updates) => set((state) => ({
        round3State: { ...state.round3State, ...updates },
      })),
      
      updateRound4State: (updates) => set((state) => ({
        round4State: { ...state.round4State, ...updates },
      })),
      
      updateRound5State: (updates) => set((state) => ({
        round5State: { ...state.round5State, ...updates },
      })),
      
      updateRound6State: (updates) => set((state) => ({
        round6State: { ...state.round6State, ...updates },
      })),
      
      // Helper functions
      getTeamByUserId: (userId) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user || !user.team_id) return undefined;
        return get().teams.find((t) => t.id === user.team_id);
      },
      
      getWalletByTeamId: (teamId) => {
        return get().wallets.find((w) => w.team_id === teamId);
      },
      
      getTeamScore: (teamId) => {
        const scores = get().scores.filter((s) => s.team_id === teamId);
        return scores.reduce((total, s) => total + s.marks, 0);
      },
      
      getTeamRoundScore: (teamId, round) => {
        const scores = get().scores.filter((s) => s.team_id === teamId && s.round === round);
        return scores.reduce((total, s) => total + s.marks, 0);
      },
      
      deductBalance: (teamId, amount, description, round) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet) return;
        
        if (wallet.usable_balance < amount) {
          throw new Error('Insufficient balance');
        }
        
        get().updateWallet(teamId, { usable_balance: wallet.usable_balance - amount });
        get().addTransaction({
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          team_id: teamId,
          type: 'manual_adjustment',
          amount: -amount,
          description,
          round,
          timestamp: new Date().toISOString(),
        });
      },
      
      addBalance: (teamId, amount, description, round) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet) return;
        
        get().updateWallet(teamId, { usable_balance: wallet.usable_balance + amount });
        get().addTransaction({
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          team_id: teamId,
          type: 'manual_adjustment',
          amount,
          description,
          round,
          timestamp: new Date().toISOString(),
        });
      },
      
      releaseFrozenBalance: (teamId) => {
        const wallet = get().getWalletByTeamId(teamId);
        if (!wallet || wallet.frozen_balance === 0) return;
        
        const frozenAmount = wallet.frozen_balance;
        get().updateWallet(teamId, {
          usable_balance: wallet.usable_balance + frozenAmount,
          frozen_balance: 0,
        });
        get().addTransaction({
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          team_id: teamId,
          type: 'freeze_release',
          amount: frozenAmount,
          description: 'Frozen ARK released for Round 2',
          round: 2,
          timestamp: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'arkk-event-storage',
      partialize: (state) => {
        // Exclude currentUser so each tab maintains its own independent session
        const { currentUser, ...rest } = state;
        return rest as AppState;
      },
      merge: (persistedState: unknown, currentState: AppState): AppState => {
        const persisted = (persistedState as Partial<AppState>) || {};
        const pQuestions = (persisted as { questions?: Question[] }).questions;
        const hasValidQuestions =
          Array.isArray(pQuestions) &&
          pQuestions.length === standardQuestions.length &&
          pQuestions[0]?.question_text === standardQuestions[0]?.question_text;

        return {
          ...currentState,
          ...persisted,
          questions: hasValidQuestions
            ? (pQuestions as Question[])
            : standardQuestions.map((q) => ({ ...q })),
          // Preserve local tab's currentUser
          currentUser: currentState.currentUser || getInitialUser(),
          round1AState: {
            ...currentState.round1AState,
            ...(persisted.round1AState || {}),
            status:
              persisted.round1AState?.status ||
              (persisted.round1AState?.active
                ? persisted.round1AState?.current_question_id
                  ? 'QUESTION_DISPLAYED'
                  : 'ROUND_STARTED_WAITING'
                : 'ROUND_NOT_STARTED'),
          },
        };
      },
    }
  )
);

// Real-time synchronization across browser tabs and windows
if (typeof window !== 'undefined') {
  let isReceivingBroadcast = false;

  try {
    if ('BroadcastChannel' in window) {
      realtimeBroadcastChannel = new BroadcastChannel('arkk-realtime-sync');
      realtimeBroadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'RESET_ALL_DATA') {
          useStore.getState().applyServerReset(event.data.epoch);
          return;
        }

        if (event.data?.type === 'SYNC_EVENT_DATA' && event.data?.payload) {
          isReceivingBroadcast = true;
          const payload = event.data.payload;
          useStore.setState((state) => ({
            ...state,
            eventState: payload.eventState || state.eventState,
            round1AState: payload.round1AState || state.round1AState,
            round1BState: payload.round1BState || state.round1BState,
            questions: payload.questions || state.questions,
            teams: payload.teams || state.teams,
            wallets: payload.wallets || state.wallets,
            scores: payload.scores || state.scores,
            zones: payload.zones || state.zones,
            currentUser: state.currentUser || getInitialUser(),
          }));
          isReceivingBroadcast = false;
        }
      };
    }
  } catch (err) {
    console.error('BroadcastChannel initialization error:', err);
  }

  // Cross-window / tab fallback with localStorage storage event
  window.addEventListener('storage', (event) => {
    if (event.key === 'arkk-event-storage' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed?.state) {
          const incoming = parsed.state;
          if (incoming.reset_epoch && incoming.reset_epoch > (useStore.getState().reset_epoch || 0)) {
            useStore.getState().applyServerReset(incoming.reset_epoch);
            return;
          }

          useStore.setState((state) => ({
            ...state,
            eventState: incoming.eventState || state.eventState,
            round1AState: incoming.round1AState || state.round1AState,
            round1BState: incoming.round1BState || state.round1BState,
            questions: incoming.questions || state.questions,
            teams: incoming.teams || state.teams,
            wallets: incoming.wallets || state.wallets,
            scores: incoming.scores || state.scores,
            zones: incoming.zones || state.zones,
            currentUser: state.currentUser || getInitialUser(),
          }));
        }
      } catch (err) {
        useStore.persist.rehydrate();
      }
    }
  });

  // Notify other tabs on any state change with direct payload
  useStore.subscribe((state) => {
    if (!isReceivingBroadcast && realtimeBroadcastChannel) {
      try {
        realtimeBroadcastChannel.postMessage({
          type: 'SYNC_EVENT_DATA',
          payload: {
            eventState: state.eventState,
            round1AState: state.round1AState,
            round1BState: state.round1BState,
            questions: state.questions,
            teams: state.teams,
            wallets: state.wallets,
            scores: state.scores,
            zones: state.zones,
          },
        });
      } catch (e) {
        // Suppress postMessage error during unmount
      }
    }
  });
}

export async function syncRound1AWithServer(): Promise<Round1AState | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/round1a', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.reset_epoch && data.reset_epoch > (useStore.getState().reset_epoch || 0)) {
      useStore.getState().applyServerReset(data.reset_epoch);
      return null;
    }

    if (data?.round1AState) {
      const serverRound1A: Round1AState = data.round1AState;
      const current = useStore.getState();
      const currentRound1A = current.round1AState;
      
      const timerDiscrepancy =
        serverRound1A.answer_timer_running !== currentRound1A.answer_timer_running ||
        (serverRound1A.answer_timer_running &&
          Math.abs((currentRound1A.answer_timer_remaining || 0) - (serverRound1A.answer_timer_remaining || 0)) > 2) ||
        (!serverRound1A.answer_timer_running &&
          currentRound1A.answer_timer_remaining !== serverRound1A.answer_timer_remaining);

      const statusChanged =
        currentRound1A.status !== serverRound1A.status ||
        currentRound1A.active !== serverRound1A.active ||
        currentRound1A.current_question_id !== serverRound1A.current_question_id ||
        currentRound1A.current_question_index !== serverRound1A.current_question_index ||
        currentRound1A.bidding_open !== serverRound1A.bidding_open ||
        currentRound1A.current_bid_amount !== serverRound1A.current_bid_amount ||
        currentRound1A.current_bidder_id !== serverRound1A.current_bidder_id ||
        currentRound1A.next_bid_amount !== serverRound1A.next_bid_amount ||
        (serverRound1A.bids?.length || 0) !== (currentRound1A.bids?.length || 0) ||
        currentRound1A.prep_timer_remaining !== serverRound1A.prep_timer_remaining ||
        currentRound1A.bidding_timer_remaining !== serverRound1A.bidding_timer_remaining ||
        currentRound1A.answering_team_id !== serverRound1A.answering_team_id ||
        currentRound1A.submitted_answer !== serverRound1A.submitted_answer ||
        currentRound1A.evaluation_result !== serverRound1A.evaluation_result ||
        timerDiscrepancy;

      const scoresMismatch =
        Array.isArray(data.scores) &&
        (data.scores.length !== current.scores.length ||
         data.scores.some((sc: Score) => {
           const existing = current.scores.find((s) => s.id === sc.id || (s.team_id === sc.team_id && s.round === sc.round));
           return !existing || existing.marks !== sc.marks;
         }));

      const walletsMismatch =
        Array.isArray(data.wallets) &&
        data.wallets.some(
          (w: Wallet) =>
            current.wallets.find((cw) => cw.team_id === w.team_id)?.usable_balance !== w.usable_balance
        );

      const activityMismatch =
        data.eventState && (
          data.eventState.current_activity !== current.eventState.current_activity ||
          data.eventState.current_round !== current.eventState.current_round
        );

      if (statusChanged || scoresMismatch || walletsMismatch || activityMismatch) {
        useStore.setState((s) => {
          let updatedScores = s.scores;
          if (Array.isArray(data.scores)) {
            updatedScores = data.scores;
          }

          let updatedWallets = s.wallets;
          if (Array.isArray(data.wallets) && data.wallets.length > 0) {
            updatedWallets = s.wallets.map((w) => {
              const sw = data.wallets.find((dw: Wallet) => dw.team_id === w.team_id);
              return sw
                ? { ...w, usable_balance: sw.usable_balance, frozen_balance: sw.frozen_balance }
                : w;
            });
          }

          return {
            ...s,
            round1AState: {
              ...serverRound1A,
              answer_timer_remaining:
                currentRound1A.answer_timer_running &&
                serverRound1A.answer_timer_running &&
                Math.abs((currentRound1A.answer_timer_remaining || 0) - (serverRound1A.answer_timer_remaining || 0)) <= 2
                  ? currentRound1A.answer_timer_remaining
                  : serverRound1A.answer_timer_remaining,
            },
            eventState: data.eventState ? { ...s.eventState, ...data.eventState } : s.eventState,
            scores: updatedScores,
            wallets: updatedWallets,
          };
        });
      }
      return serverRound1A;
    }
  } catch (err) {
    // Ignore network error
  }
  return null;
}

export async function syncRound1BWithServer(): Promise<Round1BState | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/round1b', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.reset_epoch && data.reset_epoch > (useStore.getState().reset_epoch || 0)) {
      useStore.getState().applyServerReset(data.reset_epoch);
      return null;
    }

    if (data?.round1BState) {
      const serverRound1B: Round1BState = data.round1BState;
      const current = useStore.getState();

      const bidsChanged =
        (serverRound1B.bids?.length || 0) !== (current.round1BState.bids?.length || 0) ||
        (serverRound1B.bids && serverRound1B.bids.length > 0 && current.round1BState.bids && current.round1BState.bids.length > 0 &&
         serverRound1B.bids[0].id !== current.round1BState.bids[0].id);

      const stateChanged =
        current.round1BState.active !== serverRound1B.active ||
        current.round1BState.auction_open !== serverRound1B.auction_open ||
        current.round1BState.auction_status !== serverRound1B.auction_status ||
        current.round1BState.current_auction_zone_id !== serverRound1B.current_auction_zone_id ||
        current.round1BState.current_bid_amount !== serverRound1B.current_bid_amount ||
        current.round1BState.current_bidder_id !== serverRound1B.current_bidder_id ||
        current.round1BState.next_bid_amount !== serverRound1B.next_bid_amount ||
        current.round1BState.frozen_unlocked !== serverRound1B.frozen_unlocked ||
        bidsChanged;

      const zonesSoldMismatch =
        data.zones &&
        data.zones.some(
          (z: Zone) => z.status === 'sold' && current.zones.find((cz) => cz.id === z.id)?.status !== 'sold'
        );

      if (stateChanged || zonesSoldMismatch) {
        useStore.setState((s) => ({
          ...s,
          round1BState: {
            ...s.round1BState,
            ...serverRound1B,
          },
          zones: data.zones || s.zones,
          wallets: data.wallets || s.wallets,
          eventState: data.eventState ? { ...s.eventState, ...data.eventState } : s.eventState,
        }));
      }
      return serverRound1B;
    }
  } catch (err) {
    // Ignore network error
  }
  return null;
}

export async function syncScoresWithServer(): Promise<Score[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/scores', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.scores)) {
      useStore.setState({ scores: data.scores });
      return data.scores;
    }
  } catch (err) {
    // Ignore network error
  }
  return null;
}


