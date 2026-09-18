import { NextResponse } from 'next/server';
import { Score } from '@/types';

function getSharedScores(): Score[] {
  if (!globalThis.__arkk_shared_scores) {
    globalThis.__arkk_shared_scores = [];
  }
  return globalThis.__arkk_shared_scores;
}

export async function GET() {
  const scores = getSharedScores();
  return NextResponse.json({
    scores,
    reset_epoch: globalThis.__arkk_reset_epoch || 0,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const scores = getSharedScores();

    if (action === 'SET_SCORE') {
      const { team_id, round, marks, category } = payload;
      if (!team_id || typeof round !== 'number' || typeof marks !== 'number') {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      const existingIdx = scores.findIndex((s) => s.team_id === team_id && s.round === round);
      if (existingIdx >= 0) {
        scores[existingIdx] = {
          ...scores[existingIdx],
          marks,
          category: category || scores[existingIdx].category || `Round ${round}`,
        };
      } else {
        scores.push({
          id: `score_${team_id}_r${round}_${Date.now()}`,
          team_id,
          round,
          marks,
          category: category || `Round ${round}`,
        });
      }

      // Sync to central state
      if (globalThis.__arkk_central_state) {
        globalThis.__arkk_central_state.scores = [...scores];
      }

      return NextResponse.json({
        success: true,
        scores,
      });
    }

    if (action === 'SET_BATCH_SCORES') {
      const { batch } = payload as { batch: Array<{ team_id: string; round: number; marks: number; category?: string }> };
      if (!Array.isArray(batch)) {
        return NextResponse.json({ error: 'Invalid batch array' }, { status: 400 });
      }

      for (const item of batch) {
        const { team_id, round, marks, category } = item;
        const existingIdx = scores.findIndex((s) => s.team_id === team_id && s.round === round);
        if (existingIdx >= 0) {
          scores[existingIdx] = {
            ...scores[existingIdx],
            marks,
            category: category || scores[existingIdx].category || `Round ${round}`,
          };
        } else {
          scores.push({
            id: `score_${team_id}_r${round}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            team_id,
            round,
            marks,
            category: category || `Round ${round}`,
          });
        }
      }

      if (globalThis.__arkk_central_state) {
        globalThis.__arkk_central_state.scores = [...scores];
      }

      return NextResponse.json({
        success: true,
        scores,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || 'Server error' }, { status: 500 });
  }
}
