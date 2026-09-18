'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore, syncRound1AWithServer, syncRound1BWithServer } from '@/lib/store';
import { isParticipant, getSavedSession } from '@/lib/auth';

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useStore((state) => state.currentUser);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const round1AState = useStore((state) => state.round1AState);
  const round1BState = useStore((state) => state.round1BState);
  const [authReady, setAuthReady] = useState(false);

  // 1. Continuous central server synchronization across all tabs and browsers
  useEffect(() => {
    syncRound1AWithServer();
    syncRound1BWithServer();
    const interval = setInterval(() => {
      syncRound1AWithServer();
      syncRound1BWithServer();
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // 2. Auth check and navigation lifecycle management
  useEffect(() => {
    let user = currentUser;
    if (!user) {
      user = getSavedSession('participant');
      if (user) {
        setCurrentUser(user);
      }
    }

    if (!user || !isParticipant(user)) {
      router.push('/login');
      return;
    }

    setAuthReady(true);

    const status = round1AState?.status || (round1AState?.active ? 'ROUND_STARTED_WAITING' : 'ROUND_NOT_STARTED');
    const isQuestionPhase =
      status === 'PREPARATION_30_SEC' ||
      status === 'BIDDING_OPEN_60_SEC' ||
      status === 'BIDDING_CLOSED' ||
      status === 'ADMIN_AWARDS_QUESTION' ||
      status === 'ADMIN_MARKS_CORRECT_OR_WRONG' ||
      status === 'WAIT_FOR_ADMIN_NEXT_QUESTION' ||
      status === 'QUESTION_DISPLAYED' ||
      status === 'ANSWERING_ACTIVE' ||
      status === 'ANSWER_SUBMITTED' ||
      status === 'WAITING_FOR_ADMIN_DECISION' ||
      status === 'ANSWER_CORRECT' ||
      status === 'ANSWER_WRONG' ||
      status === 'TIMES_UP';

    const isRound1AActive =
      round1AState?.active && status !== 'ROUND_ENDED' && status !== 'ROUND_NOT_STARTED' ||
      status === 'ROUND_STARTED_WAITING' ||
      status === 'WAITING_FOR_QUESTION' ||
      status === 'NEXT_QUESTION' ||
      isQuestionPhase;

    // State 2, 3, 4: When Round 1A is actively running, lock participant into Round 1A
    if (isRound1AActive) {
      if (pathname !== '/participant/round1a') {
        router.push('/participant/round1a');
      }
      return;
    }

    // State 1 & State 5: When Round 1A is NOT active, participant MUST NOT be on /participant/round1a
    if (!isRound1AActive && pathname === '/participant/round1a') {
      router.push('/participant/dashboard');
      return;
    }

    // When Round 1B is NOT active, participant MUST NOT be on /participant/round1b
    if (!round1BState?.active && pathname === '/participant/round1b') {
      router.push('/participant/dashboard');
      return;
    }

    // HARD LOCK: Future rounds (Round 2 through 6) are strictly forbidden to participants
    const isFutureBlockedRound =
      pathname.startsWith('/participant/round2') ||
      pathname.startsWith('/participant/round3') ||
      pathname.startsWith('/participant/round4') ||
      pathname.startsWith('/participant/round5') ||
      pathname.startsWith('/participant/round6');

    if (isFutureBlockedRound) {
      router.push('/participant/dashboard');
      return;
    }
  }, [currentUser, setCurrentUser, round1AState?.status, round1AState?.active, round1BState?.active, pathname, router]);

  if (!authReady && !currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-gray-400 text-sm">Restoring session...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
