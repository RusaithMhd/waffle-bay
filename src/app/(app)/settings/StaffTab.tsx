'use client'

import { useState } from 'react'
import { updateUserRole } from '@/app/actions/settings'
import { UserCog } from 'lucide-react'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role_id: string | null
}

interface Role {
  id: string
  name: string
}

export function StaffTab({ staff, roles }: { staff: Profile[], roles: Role[] }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingId(userId)
    const res = await updateUserRole(userId, newRoleId)
    if (!res.success) {
      alert(`Failed to update role: ${res.error}`)
    }
    setUpdatingId(null)
  }

  return (
    <div className="p-0">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
            <th className="p-6 font-semibold">Staff Member</th>
            <th className="p-6 font-semibold">Email</th>
            <th className="p-6 font-semibold">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-700">
          {staff.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-6 font-medium">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <UserCog className="w-5 h-5 text-orange-600" />
                  </div>
                  <span>{user.first_name || 'Unknown'} {user.last_name || ''}</span>
                </div>
              </td>
              <td className="p-6 text-gray-500">{user.email}</td>
              <td className="p-6">
                <select
                  value={user.role_id || ''}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={updatingId === user.id}
                  className="p-2 border border-gray-200 rounded-lg outline-none focus:border-orange-500 bg-white min-w-[150px] disabled:opacity-50"
                >
                  <option value="" disabled>No Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={3} className="p-8 text-center text-gray-500">
                No staff members found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
