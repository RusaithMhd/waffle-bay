'use client'

import { useState } from 'react'
import { updateUserRole }  from '@/app/actions/settings'
import { createStaffUser, updateStaffUser, deleteStaffUser } from '@/app/actions/staff'
import { UserCog, Plus, X, Eye, EyeOff, ChefHat, Store, Loader2, CheckCircle, Edit2, Trash2 } from 'lucide-react'

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

const ROLE_ICONS: Record<string, React.ReactNode> = {
  kitchen: <ChefHat className="w-4 h-4" />,
  pos:     <Store className="w-4 h-4" />,
}

const ROLE_COLORS: Record<string, string> = {
  kitchen: 'bg-amber-100 text-amber-700',
  pos:     'bg-blue-100 text-blue-700',
  admin:   'bg-purple-100 text-purple-700',
}

export function StaffTab({ staff, roles }: { staff: Profile[], roles: Role[] }) {
  const [updatingId, setUpdatingId]   = useState<string | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [showPass, setShowPass]       = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    roleId:    '',
  })

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingId(userId)
    const res = await updateUserRole(userId, newRoleId)
    if (!res.success) alert(`Failed to update role: ${res.error}`)
    setUpdatingId(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.roleId) { setCreateError('Please select a role.'); return }

    setCreating(true)
    setCreateError(null)
    const res = await createStaffUser({
      email:     form.email,
      password:  form.password,
      firstName: form.firstName,
      lastName:  form.lastName,
      roleId:    form.roleId,
    })

    if (!res.success) {
      setCreateError(res.error || 'Failed to create user.')
      setCreating(false)
      return
    }

    setCreateSuccess(true)
    setCreating(false)
    setForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' })
    setTimeout(() => { setCreateSuccess(false); setShowCreate(false) }, 2000)
  }

  const startEdit = (user: Profile) => {
    setEditingId(user.id)
    setEditForm({
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    })
  }

  const handleEditSave = async (userId: string) => {
    if (!editForm.firstName) return
    setIsProcessing(true)
    const res = await updateStaffUser(userId, editForm.firstName, editForm.lastName)
    if (res.success) {
      setEditingId(null)
    } else {
      alert(`Error: ${res.error}`)
    }
    setIsProcessing(false)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    setIsProcessing(true)
    const res = await deleteStaffUser(userId)
    if (!res.success) {
      alert(`Error: ${res.error}`)
    }
    setIsProcessing(false)
  }

  // Find display role name
  const getRoleName = (roleId: string | null) => {
    if (!roleId) return null
    return roles.find(r => r.id === roleId)?.name || null
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-[16px] font-bold text-gray-900">Staff Accounts</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Create and manage staff logins with role-based access.</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(null) }}
          className="flex items-center space-x-2 bg-[#FF6500] hover:bg-[#e65a00] text-white font-semibold text-[14px] px-4 py-2 rounded-xl transition-colors"
        >
          {showCreate ? <><X className="w-4 h-4" /><span>Cancel</span></> : <><Plus className="w-4 h-4" /><span>Create Staff</span></>}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mx-6 mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 text-[15px] mb-4">New Staff Account</h3>

          {createSuccess && (
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3 mb-4 font-semibold text-[14px]">
              <CheckCircle className="w-5 h-5" />
              <span>Staff account created successfully!</span>
            </div>
          )}

          {createError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-4 font-medium text-[14px]">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Staff Role *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {roles.map(role => {
                  const roleLower = role.name.toLowerCase()
                  const isSelected = form.roleId === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, roleId: role.id }))}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl border-2 font-semibold text-[14px] transition-all ${
                        isSelected
                          ? 'border-[#FF6500] bg-orange-50 text-[#FF6500]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {ROLE_ICONS[roleLower] || <UserCog className="w-4 h-4" />}
                      <span className="capitalize">{role.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Role hint */}
            {form.roleId && (() => {
              const selectedRole = roles.find(r => r.id === form.roleId)
              const name = selectedRole?.name.toLowerCase()
              return (
                <div className="text-[12px] text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  {name === 'kitchen' && '🍳 Kitchen staff can only access the Kitchen Display screen.'}
                  {name === 'pos'     && '🛒 POS staff can only access the Point of Sale screen.'}
                  {name !== 'kitchen' && name !== 'pos' && '👤 This role has full access to all areas.'}
                </div>
              )
            })()}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">First Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. John"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#FF6500] focus:ring-1 focus:ring-[#FF6500] bg-white"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#FF6500] bg-white"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email Address *</label>
              <input
                required
                type="email"
                placeholder="staff@wafflebay.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#FF6500] focus:ring-1 focus:ring-[#FF6500] bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Password *</label>
              <div className="relative">
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#FF6500] focus:ring-1 focus:ring-[#FF6500] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[#FF6500] hover:bg-[#e65a00] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 text-[15px]"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Account...</span></>
                : <><Plus className="w-4 h-4" /><span>Create Account</span></>
              }
            </button>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="mt-2 flex flex-col">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-gray-500 text-[12px] uppercase tracking-wider font-semibold">
          <div className="col-span-3">Staff Member</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Change Role</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-gray-50 text-[14px]">
          {staff.map((user) => {
            const roleName = getRoleName(user.role_id)
            const roleKey  = roleName?.toLowerCase() || ''
            
            if (editingId === user.id) {
              return (
                <div key={user.id} className="p-4 md:px-6 md:py-4 bg-orange-50 md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col space-y-3 md:space-y-0">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block">First Name</label>
                    <input 
                      type="text" required
                      value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                    <label className="text-xs font-semibold text-gray-500 uppercase md:hidden block mt-2">Last Name</label>
                    <input 
                      type="text"
                      value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded outline-none"
                    />
                  </div>
                  <div className="md:col-span-3 text-gray-500 hidden md:block">{user.email}</div>
                  <div className="md:col-span-2 hidden md:block">
                    <span className="text-gray-400 text-[12px]">Role change disabled while editing</span>
                  </div>
                  <div className="md:col-span-2 hidden md:block"></div>
                  <div className="md:col-span-2 flex justify-end space-x-2 mt-2 md:mt-0">
                    <button onClick={() => handleEditSave(user.id)} disabled={isProcessing || !editForm.firstName} className="text-green-600 font-medium px-4 py-2 rounded hover:bg-green-100 disabled:opacity-50 w-full md:w-auto text-center border border-green-200 md:border-none">Save</button>
                    <button onClick={() => setEditingId(null)} disabled={isProcessing} className="text-gray-600 font-medium px-4 py-2 rounded hover:bg-gray-200 disabled:opacity-50 w-full md:w-auto text-center border border-gray-200 md:border-none">Cancel</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={user.id} className="p-4 md:px-6 md:py-4 hover:bg-gray-50 transition-colors md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col space-y-3 md:space-y-0">
                <div className="md:col-span-3 font-medium text-gray-900">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 md:w-8 md:h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-[13px] shrink-0">
                      {(user.first_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="block text-base md:text-sm">{user.first_name || 'Unknown'} {user.last_name || ''}</span>
                      {/* Show email under name on mobile */}
                      <span className="block text-gray-500 text-xs md:hidden">{user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-3 text-gray-500 hidden md:block">
                  {user.email}
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase md:hidden block w-24">Role:</span>
                  {roleName ? (
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold ${ROLE_COLORS[roleKey] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_ICONS[roleKey]}
                      <span className="capitalize">{roleName}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[12px]">No role</span>
                  )}
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase md:hidden block w-24">Change:</span>
                  <select
                    value={user.role_id || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updatingId === user.id || editingId !== null}
                    className="w-full md:w-auto px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#FF6500] bg-white disabled:opacity-50 min-w-[130px]"
                  >
                    <option value="" disabled>No Role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id} className="capitalize">{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-2 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-none">
                  <button onClick={() => startEdit(user)} disabled={isProcessing || editingId !== null} className="flex-1 md:flex-none flex items-center justify-center text-blue-600 hover:text-blue-800 py-2 md:p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 border border-blue-100 md:border-transparent">
                    <Edit2 className="w-4 h-4 md:mr-0 mr-2" />
                    <span className="md:hidden font-medium text-sm">Edit</span>
                  </button>
                  <button onClick={() => handleDelete(user.id)} disabled={isProcessing || editingId !== null} className="flex-1 md:flex-none flex items-center justify-center text-red-600 hover:text-red-800 py-2 md:p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 border border-red-100 md:border-transparent">
                    <Trash2 className="w-4 h-4 md:mr-0 mr-2" />
                    <span className="md:hidden font-medium text-sm">Delete</span>
                  </button>
                </div>
              </div>
            )
          })}
          {staff.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400">
              No staff members yet. Create one above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
