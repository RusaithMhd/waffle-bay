import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { AppRole, ROLE_DISPLAY } from '@/lib/rbac'

interface AccessDeniedProps {
  role?: AppRole | null
  requiredPermission?: string
}

export function AccessDenied({ role, requiredPermission }: AccessDeniedProps) {
  const roleDisplay = role ? ROLE_DISPLAY[role] : null

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>

        {/* Heading */}
        <h1 className="text-[24px] font-black text-[#111827] mb-2">Access Denied</h1>
        <p className="text-[15px] text-[#6B7280] mb-2 leading-relaxed">
          You don&apos;t have permission to access this section.
        </p>

        {/* Role info */}
        {roleDisplay && (
          <div className="inline-flex items-center space-x-1.5 mb-6">
            <span className="text-[13px] text-[#9CA3AF]">Signed in as</span>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${roleDisplay.color}`}>
              {roleDisplay.label.toUpperCase()}
            </span>
          </div>
        )}

        {/* Go back */}
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full max-w-xs bg-[#FF6500] hover:bg-[#e65a00] text-white font-bold text-[15px] px-6 py-3.5 rounded-xl transition-colors"
        >
          Go to My Dashboard
        </Link>
      </div>
    </div>
  )
}
