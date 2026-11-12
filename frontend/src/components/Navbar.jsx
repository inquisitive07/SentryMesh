import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, Volume2, VolumeX, Clock, Activity, Bell, Server } from 'lucide-react'
import ConnectionIndicator from './ConnectionIndicator'
import { useEvents } from '../hooks/useEvents'

export default function Navbar() {
  const { isConnected, isMock, isFallback, mode, setMode, isMuted, toggleMute } = useEvents()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Digital clock update every 1s
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/alerts', label: 'Alerts', icon: Bell },
    { to: '/nodes', label: 'Nodes', icon: Server },
  ]

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b1120]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand & Tagline */}
          <div className="flex items-center gap-3 min-w-0">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400 transition-colors">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
                  SentryMesh
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                    Console
                  </span>
                </span>
                <span className="hidden md:inline-block text-xs text-slate-400 tracking-tight">
                  Trimodal Perimeter Intrusion Detection
                </span>
              </div>
            </NavLink>

            {/* Navigation tabs */}
            <nav className="hidden sm:flex items-center space-x-1 ml-6 border-l border-slate-800 pl-6">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700/80'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Controls & Indicators */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live / Demo Mode Toggle */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mode === 'live'
                    ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Connect to real FastAPI backend (http://localhost:8000)"
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mode === 'demo'
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Run in standalone simulated demo mode"
              >
                Demo
              </button>
            </div>

            {/* Backend Connection Indicator */}
            <ConnectionIndicator isConnected={isConnected} isMock={isMock} isFallback={isFallback} />

            {/* Audio Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-400 hover:bg-rose-950/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
              title={isMuted ? 'Audio alarm muted (click to unmute)' : 'Audio alarm enabled (click to mute)'}
              aria-label={isMuted ? 'Unmute alerts' : 'Mute alerts'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Live UTC/Local Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Mobile navigation bar */}
        <div className="sm:hidden flex items-center justify-around py-2 border-t border-slate-800/60">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${
                  isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  )
}

