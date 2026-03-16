'use client'
/**
 * @file GroupGoal — Objectif commun du groupe avec progression globale et par membre
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

interface GoalMember {
  userId: string
  name: string
  avatar: string | null
  memorized: number
  progressPercent: number
}

interface ActiveGoalData {
  goal: {
    id: string
    title: string
    description: string | null
    surahFrom: number | null
    surahTo: number | null
    targetCount: number | null
    deadline: string | null
  }
  target: number
  groupProgressPercent: number
  members: GoalMember[]
}

interface GroupGoalProps {
  groupId: string
  isSheikh: boolean
}

/** Formate une date ISO en string lisible */
function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Calcule les jours restants avant la deadline */
function daysRemaining(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Composant principal — affiche l'objectif actif du groupe et permet au sheikh
 * de créer / supprimer un objectif.
 */
export function GroupGoal({ groupId, isSheikh }: GroupGoalProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [surahFrom, setSurahFrom] = useState('')
  const [surahTo, setSurahTo] = useState('')
  const [targetCount, setTargetCount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [useRange, setUseRange] = useState(false)

  const { data: goalData, isLoading } = useQuery({
    queryKey: ['group-goal', groupId],
    queryFn: () => apiFetch<ActiveGoalData | null>(`/api/groups/${groupId}/goals/active`),
    enabled: !!groupId,
  })

  const createGoal = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/groups/${groupId}/goals`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-goal', groupId] })
      setShowForm(false)
      resetForm()
    },
  })

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) =>
      apiFetch(`/api/groups/${groupId}/goals/${goalId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-goal', groupId] }),
  })

  function resetForm() {
    setTitle('')
    setDescription('')
    setSurahFrom('')
    setSurahTo('')
    setTargetCount('')
    setDeadline('')
    setUseRange(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = { title }
    if (description) body.description = description
    if (deadline) body.deadline = new Date(deadline).toISOString()
    if (useRange) {
      if (surahFrom) body.surahFrom = Number(surahFrom)
      if (surahTo) body.surahTo = Number(surahTo)
    } else {
      if (targetCount) body.targetCount = Number(targetCount)
    }
    createGoal.mutate(body)
  }

  if (isLoading) {
    return <div className="h-28 bg-muted animate-pulse rounded-2xl" />
  }

  return (
    <div className="space-y-3">
      {/* ─── Objectif actif ─────────────────────────────── */}
      {goalData ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-900/20 dark:to-amber-900/10 p-3.5 sm:p-5 space-y-3 sm:space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">🎯</span>
                <h3 className="font-bold text-base truncate">{goalData.goal.title}</h3>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  Objectif actif
                </span>
              </div>
              {goalData.goal.description && (
                <p className="text-sm text-muted-foreground mt-1">{goalData.goal.description}</p>
              )}
              {goalData.goal.deadline && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⏰ {formatDeadline(goalData.goal.deadline)}
                  {' · '}
                  <span className={daysRemaining(goalData.goal.deadline) <= 7 ? 'text-red-500 font-medium' : ''}>
                    {daysRemaining(goalData.goal.deadline)} jours restants
                  </span>
                </p>
              )}
            </div>
            {isSheikh && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                >
                  Modifier
                </button>
                <button
                  onClick={() => deleteGoal.mutate(goalData.goal.id)}
                  disabled={deleteGoal.isPending}
                  className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Barre de progression globale */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression du groupe</span>
              <span className="font-bold text-emerald-600">{goalData.groupProgressPercent}%</span>
            </div>
            <div className="h-3 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalData.groupProgressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cible : {goalData.target} sourate{goalData.target > 1 ? 's' : ''}
              {goalData.goal.surahFrom !== null && goalData.goal.surahTo !== null
                ? ` (sourates ${goalData.goal.surahFrom}–${goalData.goal.surahTo})`
                : ''}
            </p>
          </div>

          {/* Progression par membre */}
          <div className="space-y-2">
            {goalData.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium truncate">{member.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 ml-2">
                      {member.memorized}/{goalData.target}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${member.progressPercent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 w-10 text-right flex-shrink-0">
                  {member.progressPercent}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        /* ─── Pas d'objectif ─────────────────────────────── */
        isSheikh ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 p-4 text-center hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors group"
          >
            <span className="text-2xl block mb-1">🎯</span>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              Définir un objectif commun
            </span>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            🎯 Aucun objectif défini pour le moment
          </div>
        )
      )}

      {/* ─── Formulaire création / modification ─────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm() } }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">🎯 Objectif commun</h2>
                <button
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="text-muted-foreground hover:text-foreground text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titre *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex : Mémoriser Juz 30"
                    maxLength={150}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description (optionnelle)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Précisions sur l'objectif…"
                    maxLength={500}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground resize-none"
                  />
                </div>

                {/* Type de cible */}
                <div className="flex rounded-xl border overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => setUseRange(false)}
                    className={`flex-1 py-2 font-medium transition-colors ${!useRange ? 'bg-emerald-600 text-white' : 'hover:bg-muted'}`}
                  >
                    Nombre de sourates
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseRange(true)}
                    className={`flex-1 py-2 font-medium transition-colors ${useRange ? 'bg-emerald-600 text-white' : 'hover:bg-muted'}`}
                  >
                    Plage (sourates X–Y)
                  </button>
                </div>

                {!useRange ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nombre cible de sourates</label>
                    <input
                      type="number"
                      min={1}
                      max={114}
                      value={targetCount}
                      onChange={(e) => setTargetCount(e.target.value)}
                      placeholder="Ex : 10"
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Sourate de début</label>
                      <input
                        type="number"
                        min={1}
                        max={114}
                        value={surahFrom}
                        onChange={(e) => setSurahFrom(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Sourate de fin</label>
                      <input
                        type="number"
                        min={1}
                        max={114}
                        value={surahTo}
                        onChange={(e) => setSurahTo(e.target.value)}
                        placeholder="114"
                        className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">Date limite (optionnelle)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {createGoal.isError && (
                  <p className="text-xs text-red-500">
                    {createGoal.error instanceof Error ? createGoal.error.message : 'Erreur lors de la création'}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createGoal.isPending || !title}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {createGoal.isPending ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
