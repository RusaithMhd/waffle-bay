'use client'

import Link from 'next/link'
import { Store, Users, Layers, Printer, Database } from 'lucide-react'

export function SettingsTabs({ activeTab }: { activeTab: string }) {
  const tabs = [
    { id: 'store', name: 'Store Config', icon: Store },
    { id: 'categories', name: 'Menu Categories', icon: Layers },
    { id: 'staff', name: 'Staff & Roles', icon: Users },
    { id: 'printer', name: 'Printer Settings', icon: Printer },
    { id: 'data', name: 'Data Management', icon: Database },
  ]

  return (
    <div className="border-b border-gray-200 w-full overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      <nav className="-mb-px flex space-x-6 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={`/settings?tab=${tab.id}`}
              className={`
                group inline-flex items-center py-4 border-b-2 font-medium text-sm
                ${isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon
                className={`
                  mr-2 h-4 w-4 md:h-5 md:w-5
                  ${isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
