'use client';

import { useState, useEffect } from 'react';
import { useStore, syncScoresWithServer } from '@/lib/store';

interface AdminRoundScoringPanelProps {
  round: number;
  roundTitle: string;
  description?: string;
}

export default function AdminRoundScoringPanel({
  round,
  roundTitle,
  description = `Enter and award points for teams in Round ${round}. All saved points immediately reflect on the participant dashboard scores in real time.`,
}: AdminRoundScoringPanelProps) {
  const teams = useStore((state) => state.teams);
  const scores = useStore((state) => state.scores);
  const setTeamRoundScore = useStore((state) => state.setTeamRoundScore);
  const setBatchTeamRoundScores = useStore((state) => state.setBatchTeamRoundScores);

  // Local draft inputs keyed by team_id
  const [pointsDraft, setPointsDraft] = useState<Record<string, string>>({});
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  useEffect(() => {
    syncScoresWithServer();
  }, [round]);

  // Keep draft state initialized from actual store scores if not yet touched
  useEffect(() => {
    const nextDraft: Record<string, string> = {};
    teams.forEach((t) => {
      const existing = scores.find((s) => s.team_id === t.id && s.round === round);
      nextDraft[t.id] = existing ? String(existing.marks) : (pointsDraft[t.id] ?? '0');
    });
    setPointsDraft((prev) => ({ ...nextDraft, ...prev }));
  }, [scores, teams, round]);

  const activeTeams = teams.filter((t) => t.active && !t.eliminated);

  const getTeamTotal = (teamId: string) => {
    return scores.filter((s) => s.team_id === teamId).reduce((sum, s) => sum + s.marks, 0);
  };

  const getTeamCurrentRoundScore = (teamId: string) => {
    const sc = scores.find((s) => s.team_id === teamId && s.round === round);
    return sc ? sc.marks : 0;
  };

  const handleInputChange = (teamId: string, val: string) => {
    setPointsDraft((prev) => ({
      ...prev,
      [teamId]: val,
    }));
    setSavedStatus((prev) => ({
      ...prev,
      [teamId]: false,
    }));
  };

  const handleQuickAdd = (teamId: string, delta: number) => {
    const cur = parseInt(pointsDraft[teamId] || '0') || 0;
    const nextVal = String(Math.max(0, cur + delta));
    handleInputChange(teamId, nextVal);
  };

  const handleSaveTeam = async (teamId: string) => {
    const rawVal = pointsDraft[teamId];
    const marks = parseInt(rawVal || '0', 10);
    if (isNaN(marks)) return;

    setSavingTeamId(teamId);
    try {
      await setTeamRoundScore(teamId, round, marks, `Round ${round}`);
      setSavedStatus((prev) => ({ ...prev, [teamId]: true }));
      setGlobalMessage(`Points saved for ${teams.find((t) => t.id === teamId)?.team_name}! Dashboard updated.`);
      setTimeout(() => {
        setSavedStatus((prev) => ({ ...prev, [teamId]: false }));
        setGlobalMessage(null);
      }, 3000);
    } catch (err: unknown) {
      alert('Error saving score: ' + (err as Error).message);
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleSaveAll = async () => {
    setBatchSaving(true);
    try {
      const batch = activeTeams.map((t) => ({
        team_id: t.id,
        round,
        marks: parseInt(pointsDraft[t.id] || '0', 10) || 0,
        category: `Round ${round}`,
      }));
      await setBatchTeamRoundScores(batch);
      setGlobalMessage(`All ${activeTeams.length} team scores for Round ${round} saved & reflected on participant dashboards!`);
      const allSaved: Record<string, boolean> = {};
      activeTeams.forEach((t) => (allSaved[t.id] = true));
      setSavedStatus(allSaved);
      setTimeout(() => {
        setSavedStatus({});
        setGlobalMessage(null);
      }, 3500);
    } catch (err: unknown) {
      alert('Error saving scores in batch: ' + (err as Error).message);
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl font-black text-white tracking-tight">{roundTitle}</h2>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-xs font-bold">
              Round {round} Points Entry
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveAll}
            disabled={batchSaving}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <span>{batchSaving ? 'Saving All...' : '💾 Save All Team Points'}</span>
          </button>
        </div>
      </div>

      {/* Global alert feedback */}
      {globalMessage && (
        <div className="my-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <span>✓</span>
          <span>{globalMessage}</span>
        </div>
      )}

      {/* Scoring Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-900/80 text-gray-400 uppercase font-bold border-b border-gray-700">
              <th className="py-3 px-3">Team</th>
              <th className="py-3 px-3">Total Score</th>
              <th className="py-3 px-3">Round {round} Saved</th>
              <th className="py-3 px-3 min-w-[200px]">Enter Round {round} Points</th>
              <th className="py-3 px-3 text-center">Quick Adjust</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/60">
            {activeTeams.map((team) => {
              const savedRoundScore = getTeamCurrentRoundScore(team.id);
              const totalScore = getTeamTotal(team.id);
              const currentInput = pointsDraft[team.id] ?? String(savedRoundScore);
              const isSaving = savingTeamId === team.id;
              const isSaved = savedStatus[team.id];
              const isDirty = String(savedRoundScore) !== currentInput;

              return (
                <tr key={team.id} className="hover:bg-gray-700/30 transition-colors">
                  {/* Team Identification */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 flex items-center justify-center font-bold text-[10px]">
                        #{team.team_number}
                      </span>
                      <div>
                        <p className="font-bold text-white text-sm">{team.team_name}</p>
                        <p className="text-[10px] text-gray-400">Team ID: {team.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* All-round Total */}
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-sm text-yellow-400">
                      {totalScore} pts
                    </span>
                  </td>

                  {/* Already Saved for this Round */}
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg font-mono font-bold text-xs text-blue-400">
                      {savedRoundScore} pts
                    </span>
                  </td>

                  {/* Point Input Box */}
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={currentInput}
                        onChange={(e) => handleInputChange(team.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTeam(team.id);
                          }
                        }}
                        placeholder="0"
                        className={`w-28 px-3 py-1.5 bg-gray-900 border rounded-xl font-mono text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          isDirty
                            ? 'border-yellow-500/70 bg-yellow-950/20 text-yellow-300'
                            : 'border-gray-700'
                        }`}
                      />
                      <span className="text-gray-400 text-xs">pts</span>
                    </div>
                  </td>

                  {/* Quick Adjust Buttons */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(team.id, 5)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-bold text-gray-300 hover:text-white"
                        title="Add 5 points"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(team.id, 10)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-bold text-gray-300 hover:text-white"
                        title="Add 10 points"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(team.id, 25)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-bold text-gray-300 hover:text-white"
                        title="Add 25 points"
                      >
                        +25
                      </button>
                    </div>
                  </td>

                  {/* Individual Save Button */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleSaveTeam(team.id)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        isSaved
                          ? 'bg-emerald-600 text-white shadow-md'
                          : isDirty
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black font-black shadow-md'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isSaving ? 'Saving...' : isSaved ? 'Saved ✓' : isDirty ? 'Update' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
