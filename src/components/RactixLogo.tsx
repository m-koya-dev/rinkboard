export default function RactixLogo({
  className = "w-10 h-10",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-label="Ractix logo"
      role="img"
    >
      <defs>
        <linearGradient id="bgGrad" x1="18" y1="14" x2="110" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2f3553" />
          <stop offset="55%" stopColor="#09152f" />
          <stop offset="100%" stopColor="#000d24" />
        </linearGradient>

        <linearGradient id="limeGrad" x1="20" y1="18" x2="104" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e8e25a" />
          <stop offset="38%" stopColor="#b9da52" />
          <stop offset="72%" stopColor="#7dc34a" />
          <stop offset="100%" stopColor="#56a93e" />
        </linearGradient>

        <linearGradient id="limeSoft" x1="30" y1="72" x2="54" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d6df5a" />
          <stop offset="100%" stopColor="#63b547" />
        </linearGradient>

        <filter id="shadow" x="0" y="0" width="128" height="128" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* background card */}
      <g filter="url(#shadow)">
        <rect x="16" y="14" width="96" height="96" rx="22" fill="url(#bgGrad)" />
      </g>

      {/* top rail */}
      <path
        d="M32 28H73C92 28 104 39 104 56C104 69 97 78 85 84"
        stroke="url(#limeGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* right B spine / outer curve */}
      <path
        d="M83 44C91 46 96 52 96 60C96 68 91 74 83 77M83 77C89 80 93 86 93 94C93 99 91 103 87 107"
        stroke="url(#limeGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* inner B */}
      <path
        d="M63 52H76C83 52 87 56 87 62C87 68 83 72 76 72H63"
        stroke="url(#limeGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* stick shaft / diagonal */}
      <path
        d="M38 34L64 88"
        stroke="url(#limeGrad)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* stick blade */}
      <path
        d="M64 88C69 97 76 103 86 104"
        stroke="url(#limeGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* dashed tactic line */}
      <path
        d="M30 48L44 81"
        stroke="#5ca14b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="10 8"
        opacity="0.9"
      />

      {/* puck */}
      <circle cx="42" cy="98" r="9" fill="url(#limeSoft)" />
    </svg>
  );
}