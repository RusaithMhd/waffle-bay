import { AppRole, ROLE_DISPLAY } from '@/lib/rbac'

interface RoleBadgeProps {
  role: AppRole | null | undefined
  size?: 'sm' | 'md'
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  if (!role) return null
  const cfg = ROLE_DISPLAY[role]
  if (!cfg) return null

  const sizeClass = size === 'md'
    ? 'text-[12px] px-2.5 py-1 font-bold'
    : 'text-[10px] px-2 py-0.5 font-bold'

  return (
    <span className={`inline-flex items-center rounded-md uppercase tracking-wide ${sizeClass} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
