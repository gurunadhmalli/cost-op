import React from 'react';

/**
 * IndustrialBackground
 * Renders the photorealistic night-time refinery skyline with glowing distillation
 * towers, steam, warm industrial lighting, and an animated cybernetic AI constellation
 * network overlay with glowing teal nodes and data telemetry.
 */
export const IndustrialBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* High resolution industrial refinery photo background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: `url('/refinery-bg.jpg')`,
          filter: 'brightness(0.82) contrast(1.15)',
        }}
      />

      {/* Atmospheric Dark & Teal Scrim Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/95 via-[#030712]/75 to-[#030712]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]/90" />

      {/* Radial horizon glow */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* SVG AI Constellation Network Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="netGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Network Connection Lines */}
        <g stroke="url(#netGlow)" strokeWidth="1" opacity="0.6">
          <line x1="280" y1="180" x2="360" y2="240" />
          <line x1="360" y1="240" x2="480" y2="140" />
          <line x1="480" y1="140" x2="520" y2="280" />
          <line x1="520" y1="280" x2="650" y2="210" />
          <line x1="650" y1="210" x2="740" y2="340" />
          <line x1="480" y1="140" x2="650" y2="210" />
          <line x1="360" y1="240" x2="520" y2="280" />
          <line x1="280" y1="180" x2="420" y2="380" opacity="0.4" />
          <line x1="420" y1="380" x2="520" y2="280" opacity="0.4" />
          <line x1="520" y1="280" x2="610" y2="450" opacity="0.4" />
          <line x1="650" y1="210" x2="800" y2="260" opacity="0.5" />
          <line x1="740" y1="340" x2="800" y2="260" opacity="0.5" />
        </g>

        {/* Constellation Data Nodes */}
        {[
          { cx: 280, cy: 180, r: 3, label: 'TOWER 4' },
          { cx: 360, cy: 240, r: 2.5, label: 'FLOW-914' },
          { cx: 480, cy: 140, r: 4, pulse: true, label: 'AI CORE' },
          { cx: 520, cy: 280, r: 3, label: 'COLUMN 17' },
          { cx: 650, cy: 210, r: 3.5, pulse: true, label: 'REACTOR 2B' },
          { cx: 740, cy: 340, r: 2.5, label: 'BOILER 09' },
          { cx: 420, cy: 380, r: 2, label: 'PUMP 04' },
          { cx: 610, cy: 450, r: 2.5, label: 'EXCHANGE 12' },
          { cx: 800, cy: 260, r: 3, label: 'STACK 03' },
        ].map((node, i) => (
          <g key={i}>
            {/* Outer halo */}
            <circle
              cx={node.cx}
              cy={node.cy}
              r={node.r * 2.8}
              fill="#14b8a6"
              opacity="0.15"
              className={node.pulse ? 'animate-ping' : ''}
            />
            {/* Main node point */}
            <circle
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill="#2dd4bf"
              filter="url(#glow)"
            />
          </g>
        ))}

        {/* Subtle Ambient Data Particle Starfield */}
        {[
          [120, 90], [210, 140], [330, 80], [450, 60], [580, 110], [690, 70],
          [780, 130], [890, 95], [160, 290], [260, 420], [380, 490], [540, 520],
          [710, 480], [830, 410], [920, 230], [80, 440], [940, 390], [60, 200],
        ].map(([cx, cy], i) => (
          <circle
            key={`star-${i}`}
            cx={cx}
            cy={cy}
            r={i % 3 === 0 ? 1.5 : 0.9}
            fill="#a5f3fc"
            opacity={0.3 + (i % 4) * 0.15}
          />
        ))}
      </svg>
    </div>
  );
};
