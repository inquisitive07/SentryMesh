import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { CLASS_CONFIG, ALERT_CLASSES } from '../utils/labels'

export default function ClassChart({ events = [], includeNoise = false }) {
  // Count frequency of each class in events
  const counts = {}
  const targetClasses = includeNoise ? Object.keys(CLASS_CONFIG) : ALERT_CLASSES

  targetClasses.forEach((cls) => {
    counts[cls] = 0
  })

  events.forEach((ev) => {
    if (counts[ev.class] !== undefined) {
      counts[ev.class] += 1
    }
  })

  const data = targetClasses
    .map((cls) => ({
      key: cls,
      label: CLASS_CONFIG[cls]?.label || cls,
      count: counts[cls] || 0,
      color: CLASS_CONFIG[cls]?.color || '#94a3b8',
    }))
    .sort((a, b) => b.count - a.count)

  const totalAlerts = data.reduce((sum, item) => sum + item.count, 0)

  if (totalAlerts === 0) {
    return (
      <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-5 shadow-lg flex flex-col justify-between h-[310px]">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Alert Class Distribution</h3>
          <p className="text-xs text-slate-400">Classified intrusion ground activity</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
          <p>No intrusion events detected yet</p>
          <span className="text-[11px] text-slate-600 mt-1">Perimeter is quiet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-5 shadow-lg flex flex-col justify-between h-[310px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Alert Class Distribution</h3>
          <p className="text-xs text-slate-400">Classified intrusion ground activity</p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {totalAlerts} alerts
        </span>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  const percentage = totalAlerts > 0 ? Math.round((item.count / totalAlerts) * 100) : 0
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs">
                      <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </p>
                      <p className="font-mono text-slate-300 mt-1">
                        {item.count} events ({percentage}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.key}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

