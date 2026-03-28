'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, Signal } from 'lucide-react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-[#020204] border-t border-[#111118] flex items-center px-4 gap-3 z-50 select-none">
      {/* Connection */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] blink" />
        <Wifi className="w-3 h-3 text-[#00ff88]" />
        <span className="text-[10px] font-mono text-[#00ff88] tracking-wider">CONNECTED</span>
      </div>

      <span className="text-[#1a1a2e] font-mono">│</span>

      <div className="flex items-center gap-1.5 text-[#374151]">
        <Signal className="w-3 h-3" />
        <span className="text-[10px] font-mono tracking-wider">WS://LOCALHOST:3000</span>
      </div>

      <span className="text-[#1a1a2e] font-mono">│</span>

      <div className="flex items-center gap-1.5 text-[#374151]">
        <Activity className="w-3 h-3" />
        <span className="text-[10px] font-mono tracking-wider">VEX OS v2.4.1</span>
      </div>

      <span className="text-[#1a1a2e] font-mono">│</span>

      <span className="text-[10px] font-mono text-[#2a2a3e] tracking-widest">
        AGENT MONITORING SYSTEM · REAL-TIME
      </span>

      <div className="ml-auto text-[10px] font-mono text-[#4b5563] tracking-widest tabular-nums">
        {time}
      </div>
    </div>
  );
}
