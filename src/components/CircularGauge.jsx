import React from 'react';

export default function CircularGauge({ value, max = 100, size = 140, strokeWidth = 10, color = 'var(--accent)', label, sublabel }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const dash = pct * circ;

  return (
    <div className="gauge-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="gauge-label">
        <span className="gauge-value" style={{ color }}>{Math.round(value)}</span>
        {sublabel && <span className="gauge-unit">{sublabel}</span>}
      </div>
    </div>
  );
}
