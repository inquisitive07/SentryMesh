import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { buildHourlyBuckets } from '../utils/time'

export default function TimelineChart({ events = [] }) {
  const chartData = useMemo(() => {
    return buildHourlyBuckets(events)
  }, [events])

  const total24h = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.total, 0)
  }, [chartData])

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-5 shadow-lg flex flex-col justify-between h-[310px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Alerts Over Time (24h)</h3>
          <p className="text-xs text-slate-400">Hourly volume: CCTV Verified vs Sensor Unverified</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {total24h} total
          </span>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={3}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const verifiedVal = payload.find((p) => p.dataKey === 'verified')?.value || 0
                  const unverifiedVal = payload.find((p) => p.dataKey === 'unverified')?.value || 0
                  const total = verifiedVal + unverifiedVal

                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                      <p className="font-bold text-slate-200">{label} (Past 24h)</p>
                      <div className="flex items-center justify-between gap-4 text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Verified:
                        </span>
                        <span className="font-mono font-semibold">{verifiedVal}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Unverified:
                        </span>
                        <span className="font-mono font-semibold">{unverifiedVal}</span>
                      </div>
                      <div className="border-t border-slate-800 pt-1 flex justify-between font-mono text-slate-300">
                        <span>Total:</span>
                        <span>{total}</span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 6, fontSize: 11 }}
            />
            {/* Stacked Bars: Verified (green/emerald) + Unverified (amber) */}
            <Bar
              dataKey="verified"
              name="Verified by CCTV"
              stackId="a"
              fill="#10b981"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="unverified"
              name="Unverified (Sensors)"
              stackId="a"
              fill="#f59e0b"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

