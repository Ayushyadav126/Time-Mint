import React from 'react';

const STAGE_COLORS = {
  normal: 'var(--accent-gold)',   // Time Mint spend-active color
  warning: 'var(--gold-border)',  // Muted gold warning tone
  critical: 'var(--text-muted)',  // Muted critical tone
};

export const SpendRing = ({
  percentRemaining = 100,
  colorStage = 'normal',
  size = 240,
  strokeWidth = 12,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, Number(percentRemaining) || 0));
  const strokeDashoffset = circumference * (1 - clampedPercent / 100);
  const strokeColor = STAGE_COLORS[colorStage] || STAGE_COLORS.normal;

  return (
    <div 
      className="spend-ring-container"
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)',
          display: 'block',
        }}
      >
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="var(--bg-card)"
          stroke="var(--track-bg)"
          strokeWidth={strokeWidth}
        />
        {/* Animated Spend Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease',
          }}
        />
      </svg>
      {children && (
        <div
          className="spend-ring-inner-content"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default SpendRing;
