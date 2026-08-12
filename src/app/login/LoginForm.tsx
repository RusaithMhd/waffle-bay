'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { login } from './actions'

export function LoginForm({ message }: { message?: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    // Removed artificial delay for faster login
    
    await login(formData)
    
    // If login fails, the server action will redirect back here with a message
    setIsLoading(false)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium leading-6 text-white mb-2 drop-shadow-sm"
        >
          Email Address
        </label>
        <div className="mt-2">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4 text-white shadow-inner placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 sm:text-sm sm:leading-6 transition-all"
            placeholder="cashier@wafflebay.com"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium leading-6 text-white mb-2 drop-shadow-sm"
        >
          Password
        </label>
        <div className="mt-2 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="block w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-4 pr-12 text-white shadow-inner placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 sm:text-sm sm:leading-6 transition-all"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white focus:outline-none transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-100 p-4 rounded-xl text-sm font-medium text-center shadow-lg">
          {message}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center space-x-2 rounded-xl bg-orange-500 px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-lg hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed border border-orange-400"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in to POS</span>
          )}
        </button>
      </div>
      
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-sm font-medium leading-6">
          <span className="px-6 text-white/70 bg-transparent">Authorized Personnel Only</span>
        </div>
      </div>
    </form>
  )
}
