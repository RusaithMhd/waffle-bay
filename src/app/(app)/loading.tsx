import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex-1 h-full w-full flex items-center justify-center bg-gray-50/50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-medium text-gray-500 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
