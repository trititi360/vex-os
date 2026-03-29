interface OrgNodeProps {
  emoji: string;
  name: string;
  title: string;
  role: 'Human' | 'AI';
  status: 'online' | 'offline' | 'coming-soon';
  description: string;
  task?: string;
  accent: string;
}

export default function OrgNode({
  emoji,
  name,
  title,
  role,
  status,
  description,
  task,
  accent,
}: OrgNodeProps) {
  const isOnline = status === 'online';
  const isComingSoon = status === 'coming-soon';

  const dotColor = isComingSoon ? '#374151' : isOnline ? accent : '#ff4444';
  const roleBadgeColor = role === 'Human' ? '#ffaa00' : accent;

  return (
    <div
      className="rounded-xl border bg-[#0a0a0e] p-5 w-80 relative overflow-hidden transition-all duration-300 hover:bg-[#0d0d12]"
      style={{
        borderColor: `${accent}30`,
        opacity: isComingSoon ? 0.65 : 1,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}70, transparent)`,
        }}
      />

      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Emoji avatar */}
        <div
          className="text-xl w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            backgroundColor: `${accent}12`,
            border: `1px solid ${accent}25`,
          }}
        >
          {emoji}
        </div>

        {/* Name + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-[#e0e0e0] tracking-wide truncate">
              {name}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'blink' : ''}`}
              style={{ backgroundColor: dotColor }}
            />
          </div>
          <div className="text-[10px] font-mono tracking-[0.18em] mt-0.5" style={{ color: accent }}>
            {title}
          </div>
        </div>

        {/* Role badge */}
        <div
          className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest flex-shrink-0 mt-0.5"
          style={{
            color: roleBadgeColor,
            backgroundColor: `${roleBadgeColor}12`,
            border: `1px solid ${roleBadgeColor}28`,
          }}
        >
          {role === 'Human' ? 'HUMAN' : 'A·I'}
        </div>
      </div>

      {/* Divider + details */}
      <div className="mt-3 pt-3 border-t border-[#111118] space-y-2">
        <p className="text-[11px] font-mono text-[#6b7280] leading-relaxed">{description}</p>

        {/* Task / status line */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[#2a2a3e] tracking-widest uppercase">
            Status
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: isComingSoon ? '#374151' : accent }}
          >
            {isComingSoon ? '— Coming soon' : task ?? 'Currently idle'}
          </span>
        </div>
      </div>
    </div>
  );
}
