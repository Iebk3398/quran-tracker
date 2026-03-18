'use client'
/**
 * @file GroupsClient — Gestion multi-groupe
 * @description
 *   - Liste tous les groupes de l'utilisateur
 *   - Créer / rejoindre un nouveau groupe
 *   - Changer de groupe actif
 *   - Modifier nom/description (sheikh)
 *   - Régénérer le code d'invitation (sheikh)
 *   - Quitter un groupe (membres)
 *   - Supprimer un groupe (propriétaire)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, LogIn, Copy, Check, RefreshCw,
  Pencil, Trash2, LogOut, ChevronRight, Crown,
  X, Share2, Loader2,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyGroup {
  id: string
  name: string
  description: string | null
  inviteCode: string
  sheikhId: string
  createdAt: string
  role: 'sheikh' | 'student' | 'parent'
  memberCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: MyGroup['role'] }) {
  if (role === 'sheikh') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        <Crown className="w-2.5 h-2.5" /> Sheikh
      </span>
    )
  }
  if (role === 'parent') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
        Parent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      Élève
    </span>
  )
}

// ─── Carte groupe ─────────────────────────────────────────────────────────────

function GroupCard({
  group,
  isActive,
  currentUserId,
  onSwitch,
}: {
  group: MyGroup
  isActive: boolean
  currentUserId: string
  onSwitch: (g: MyGroup) => void
}) {
  const queryClient = useQueryClient()
  const isSheikh = group.role === 'sheikh'
  const isOwner = group.sheikhId === currentUserId

  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState(group.name)
  const [editDesc, setEditDesc]     = useState(group.description ?? '')
  const [copied, setCopied]         = useState(false)
  const [shared, setShared]         = useState(false)
  const [confirmLeave, setConfirmLeave]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Mutations ──

  const editGroup = useMutation({
    mutationFn: () =>
      apiFetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, description: editDesc || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      setEditing(false)
    },
  })

  const regenInvite = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; data: { inviteCode: string } }>(
        `/api/groups/${group.id}/regenerate-invite`, { method: 'POST' }
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-groups'] }),
  })

  const leaveGroup = useMutation({
    mutationFn: () =>
      apiFetch(`/api/groups/${group.id}/leave`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      setConfirmLeave(false)
    },
  })

  const deleteGroup = useMutation({
    mutationFn: () =>
      apiFetch(`/api/groups/${group.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      setConfirmDelete(false)
    },
  })

  // ── Helpers ──

  async function handleCopy() {
    await navigator.clipboard.writeText(group.inviteCode).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const text = `Rejoins ma halqa "${group.name}" sur Quran Tracker 📖\n\nCode : ${group.inviteCode}\n\nhttps://quran-tracker-web.vercel.app`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Rejoins ${group.name}`, text })
      } else {
        await navigator.clipboard.writeText(text)
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      }
    } catch { /* annulé */ }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'rounded-2xl border-2 p-4 transition-colors',
        isActive
          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-stone-200 dark:border-stone-800 bg-card'
      )}
    >
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={60}
              className="w-full text-base font-bold bg-transparent border-b-2 border-emerald-400 focus:outline-none text-stone-900 dark:text-stone-100 mb-1"
              autoFocus
            />
          ) : (
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
              {group.name}
            </h3>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <RoleBadge role={group.role} />
            <span className="text-[11px] text-stone-400">
              {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
            </span>
            {isActive && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="w-2.5 h-2.5" /> Actif
              </span>
            )}
          </div>
        </div>

        {/* Bouton changer de groupe */}
        {!isActive && (
          <button
            onClick={() => onSwitch(group)}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            Activer <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Description (édition) ── */}
      {editing && (
        <textarea
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Description (optionnel)"
          maxLength={200}
          rows={2}
          className="w-full mt-2 text-sm bg-stone-100 dark:bg-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-stone-700 dark:text-stone-300 resize-none"
        />
      )}
      {!editing && group.description && (
        <p className="mt-1.5 text-[12px] text-stone-500 dark:text-stone-400 line-clamp-2">
          {group.description}
        </p>
      )}

      {/* ── Code d'invitation (sheikh) ── */}
      {isSheikh && !editing && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <code className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 tracking-widest">
            {group.inviteCode}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            {shared ? <><Check className="w-3 h-3 text-emerald-500" /> Copié</> : <><Share2 className="w-3 h-3" /> Partager</>}
          </button>
          <button
            onClick={() => regenInvite.mutate()}
            disabled={regenInvite.isPending}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            title="Nouveau code"
          >
            {regenInvite.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            Nouveau code
          </button>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {editing ? (
          <>
            <button
              onClick={() => editGroup.mutate()}
              disabled={editGroup.isPending || editName.length < 2}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {editGroup.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Enregistrer
            </button>
            <button
              onClick={() => { setEditing(false); setEditName(group.name); setEditDesc(group.description ?? '') }}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-xl transition-colors"
            >
              <X className="w-3 h-3" /> Annuler
            </button>
          </>
        ) : (
          <>
            {isSheikh && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            )}

            {/* Quitter (membres non-sheikh) */}
            {!isOwner && (
              confirmLeave ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400">Confirmer ?</span>
                  <button
                    onClick={() => leaveGroup.mutate()}
                    disabled={leaveGroup.isPending}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {leaveGroup.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Oui, quitter'}
                  </button>
                  <button onClick={() => setConfirmLeave(false)} className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                    Non
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeave(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <LogOut className="w-3 h-3" /> Quitter
                </button>
              )
            )}

            {/* Supprimer (owner sheikh) */}
            {isOwner && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 dark:text-red-400">Supprimer définitivement ?</span>
                  <button
                    onClick={() => deleteGroup.mutate()}
                    disabled={deleteGroup.isPending}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleteGroup.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Supprimer'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              )
            )}
          </>
        )}
      </div>

      {/* Erreurs */}
      {leaveGroup.error && (
        <p className="mt-2 text-xs text-red-500">
          {(leaveGroup.error as Error).message === 'LAST_SHEIKH'
            ? 'Vous êtes le seul sheikh. Supprimez le groupe pour le dissoudre.'
            : 'Erreur lors du départ.'}
        </p>
      )}
      {deleteGroup.error && (
        <p className="mt-2 text-xs text-red-500">Erreur lors de la suppression.</p>
      )}
    </motion.div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Page de gestion multi-groupe.
 * Permet de voir, créer, rejoindre, modifier et quitter des groupes.
 */
export function GroupsClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, activeGroupId, setActiveGroup } = useAppStore()
  const currentUserId = user?.id ?? ''

  // ── UI State ──
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin]     = useState(false)
  const [groupName, setGroupName]   = useState('')
  const [groupDesc, setGroupDesc]   = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinError, setJoinError]     = useState<string | null>(null)

  // ── Query ──
  const { data: myGroups = [], isLoading } = useQuery<MyGroup[]>({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch('/api/groups/me'),
    enabled: !!currentUserId,
  })

  // ── Mutations ──
  const createGroup = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; data: MyGroup }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName, description: groupDesc || undefined }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      if (res?.data) {
        setActiveGroup({ ...res.data, memberCount: undefined } as Parameters<typeof setActiveGroup>[0])
      }
      setShowCreate(false)
      setGroupName('')
      setGroupDesc('')
      router.push('/dashboard')
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Erreur'),
  })

  const joinGroup = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; data: MyGroup }>('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      if (res?.data) {
        setActiveGroup({ ...res.data, memberCount: undefined } as Parameters<typeof setActiveGroup>[0])
      }
      setShowJoin(false)
      setInviteCode('')
      router.push('/dashboard')
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      setJoinError(msg === 'INVALID_CODE' ? 'Code invalide ou groupe inexistant.' : msg === 'ALREADY_MEMBER' ? 'Vous êtes déjà membre de ce groupe.' : 'Erreur lors de la connexion.')
    },
  })

  // ── Switch de groupe actif ──
  function handleSwitch(group: MyGroup) {
    setActiveGroup(group)
    router.push('/dashboard')
  }

  // ── Rendu ──

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse pb-24">
        {[1, 2].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Mes groupes</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {myGroups.length === 0
              ? 'Rejoignez ou créez votre première halqa'
              : `${myGroups.length} groupe${myGroups.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setJoinError(null) }}
            className={cn(
              'flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-all',
              showJoin
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            )}
          >
            <LogIn className="w-4 h-4" /> Rejoindre
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setCreateError(null) }}
            className={cn(
              'flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-all',
              showCreate
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>
      </div>

      {/* ── Formulaire rejoindre ── */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 p-4 space-y-3 bg-emerald-50/40 dark:bg-emerald-950/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Rejoindre une halqa</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Entrez le code donné par votre sheikh</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value.toUpperCase()); setJoinError(null) }}
                  placeholder="Ex : ABC12345"
                  maxLength={12}
                  className="flex-1 px-3 py-2 rounded-xl border bg-white dark:bg-stone-900 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                />
                <button
                  onClick={() => joinGroup.mutate()}
                  disabled={joinGroup.isPending || inviteCode.length < 6}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {joinGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rejoindre'}
                </button>
              </div>
              {joinError && <p className="text-xs text-red-500">{joinError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Formulaire créer ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 p-4 space-y-3 bg-amber-50/40 dark:bg-amber-950/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Créer une halqa</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Vous serez sheikh de ce groupe</p>
                </div>
              </div>
              <input
                value={groupName}
                onChange={e => { setGroupName(e.target.value); setCreateError(null) }}
                placeholder="Nom du groupe"
                maxLength={60}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-muted-foreground"
              />
              <input
                value={groupDesc}
                onChange={e => setGroupDesc(e.target.value)}
                placeholder="Description (optionnel)"
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-muted-foreground"
              />
              <button
                onClick={() => createGroup.mutate()}
                disabled={createGroup.isPending || groupName.length < 2}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {createGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Créer la halqa</>}
              </button>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Liste des groupes ── */}
      {myGroups.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🕌</div>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Vous n&apos;avez pas encore de groupe.
          </p>
          <p className="text-stone-400 dark:text-stone-500 text-xs">
            Créez ou rejoignez une halqa en utilisant les boutons ci-dessus.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {myGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                isActive={group.id === activeGroupId}
                currentUserId={currentUserId}
                onSwitch={handleSwitch}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
