'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface ChartDataPoint {
  name: string
  revenue: number
  expenses: number
}

interface AccountingChartProps {
  data: ChartDataPoint[]
  currencySymbol: string
}

export function AccountingChart({ data, currencySymbol }: AccountingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-72 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200 mt-6">
        <p className="text-gray-500 font-medium">No data available for this period.</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[400px] bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Overview</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any) => [`${currencySymbol} ${Number(value || 0).toFixed(2)}`, undefined]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#16a34a" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
