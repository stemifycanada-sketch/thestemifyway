import { useId } from 'react'

/** Small editorial illustrations, kept as vectors so they stay crisp at every size. */
export function AdaptiveGraphic({ index }: { index: number }) {
  const id = useId()
  const orange = `url(#${id}-orange)`
  const blue = `url(#${id}-blue)`
  const cream = `url(#${id}-cream)`

  const drawings = [
    <g key="pace">
      <ellipse cx="61" cy="94" rx="39" ry="6" fill="#cabaa6" opacity=".22" />
      <circle cx="62" cy="57" r="36" fill="#1836a4" />
      <circle cx="58" cy="53" r="36" fill={blue} />
      <circle cx="58" cy="53" r="27" fill={cream} stroke="#fff" strokeWidth="2" />
      <path d="M37 56a22 22 0 0 1 37-18" fill="none" stroke="#ff6b24" strokeWidth="6" strokeLinecap="round" />
      <path d="M58 32v5m-21 16h5m32 0h5m-21 16v5" stroke="#c5c1b9" strokeWidth="2" strokeLinecap="round" />
      <path className="graphic-needle" d="m58 54 13-14" stroke="#202521" strokeWidth="4" strokeLinecap="round" />
      <circle cx="58" cy="54" r="5" fill={orange} />
      <path d="M16 40H8m12 13H6m16 13H12" stroke="#ff7a35" strokeWidth="3" strokeLinecap="round" />
    </g>,
    <g key="level" strokeLinejoin="round">
      <ellipse cx="62" cy="94" rx="43" ry="6" fill="#cabaa6" opacity=".22" />
      <g className="graphic-step graphic-step--0">
      <path d="m16 71 18-10 19 9-18 11Z" fill="#86a7ff" />
      <path d="M16 71v19l19 10V81Z" fill={blue} /><path d="m35 81 18-11v19l-18 11Z" fill="#2345b8" />
      </g>
      <g className="graphic-step graphic-step--1">
      <path d="m43 50 18-10 19 9-18 11Z" fill="#86a7ff" />
      <path d="M43 50v33l19 10V60Z" fill={blue} /><path d="m62 60 18-11v33L62 93Z" fill="#2345b8" />
      </g>
      <g className="graphic-step graphic-step--2">
      <path d="m70 26 18-10 19 9-18 11Z" fill="#ffb164" />
      <path d="M70 26v51l19 10V36Z" fill={orange} /><path d="m89 36 18-11v51L89 87Z" fill="#d94b18" />
      <path d="m83 26 5 3 9-5" stroke="#fff4dc" strokeWidth="2" fill="none" />
      </g>
    </g>,
    <g key="style">
      <ellipse cx="61" cy="95" rx="40" ry="5" fill="#cabaa6" opacity=".22" />
      <path d="M29 74V56q0-13 15-13h20q16 0 16-16M56 44v26m24-27v30" fill="none" stroke="#d5d9e3" strokeWidth="7" strokeLinecap="round" />
      <path className="graphic-route" pathLength="1" d="M29 73V56q0-13 15-13h20q16 0 16-16" fill="none" stroke="#4071f1" strokeWidth="4" strokeLinecap="round" />
      <rect x="13" y="65" width="32" height="29" rx="10" fill="#2445ae" />
      <rect x="12" y="62" width="32" height="29" rx="10" fill={blue} />
      <circle cx="56" cy="75" r="12" fill={orange} />
      <path d="m83 60 17 29H66Z" fill={blue} stroke="#406cec" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="81" cy="23" r="14" fill={orange} />
      <path d="m75 23 4 4 7-8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>,
    <g key="practice">
      <ellipse cx="59" cy="95" rx="35" ry="5" fill="#cabaa6" opacity=".22" />
      <ellipse cx="59" cy="58" rx="33" ry="36" fill="#d64b17" />
      <ellipse cx="55" cy="55" rx="33" ry="36" fill={orange} />
      <ellipse cx="55" cy="55" rx="24" ry="26" fill={cream} />
      <ellipse cx="55" cy="55" rx="15" ry="17" fill={orange} />
      <ellipse cx="55" cy="55" rx="6" ry="7" fill="#fff6e8" />
      <g className="graphic-arrow">
      <path d="m56 54 34-29" stroke="#192e79" strokeWidth="5" strokeLinecap="round" />
      <path d="m83 31 1-17 11-6 1 15 14 4-12 9Z" fill={blue} stroke="#7094fa" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </g>,
    <g key="interactivity">
      <ellipse cx="59" cy="94" rx="40" ry="6" fill="#cabaa6" opacity=".22" />
      <path d="M31 31h43a13 13 0 0 1 13 13v23a13 13 0 0 1-13 13H54L36 91V80h-5a13 13 0 0 1-13-13V44a13 13 0 0 1 13-13" fill="#1c3bb5" />
      <path d="M29 26h43a13 13 0 0 1 13 13v23a13 13 0 0 1-13 13H52L34 86V75h-5a13 13 0 0 1-13-13V39a13 13 0 0 1 13-13" fill={blue} />
      <circle className="graphic-dot graphic-dot--0" cx="35" cy="49" r="4" fill="#fff" /><circle className="graphic-dot graphic-dot--1" cx="50" cy="49" r="4" fill="#fff" /><circle className="graphic-dot graphic-dot--2" cx="65" cy="49" r="4" fill="#fff" />
      <path className="graphic-cursor" d="m76 55 27 21-13 3-5 14Z" fill={orange} stroke="#fff2dd" strokeWidth="2" strokeLinejoin="round" />
      <path d="m91 24 5-7m1 17 9-2" stroke="#ff782f" strokeWidth="3" strokeLinecap="round" />
    </g>,
    <g key="challenge" strokeLinejoin="round">
      <ellipse cx="62" cy="95" rx="41" ry="5" fill="#cabaa6" opacity=".22" />
      <path d="m12 89 28-39 16 20 23-38 29 57Z" fill={blue} />
      <path d="m79 32-4 57h33Z" fill="#2442b0" />
      <path d="m40 50-3 39h25Z" fill="#254ac5" />
      <path d="m68 50 11-18 12 24-12-6-6 5Z" fill="#fff5df" />
      <path d="M79 32V9" stroke="#26303e" strokeWidth="3" strokeLinecap="round" />
      <path className="graphic-flag" d="M81 9q13-5 24 1l-5 8q-9-5-19 0Z" fill={orange} />
      <path d="m43 89 12-10 5 4 9-12" stroke="#ffc57c" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>,
  ]

  return <svg className="adapt-graphic" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-orange`} x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#ffad57" /><stop offset=".5" stopColor="#ff762b" /><stop offset="1" stopColor="#ef511c" /></linearGradient>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#89aaff" /><stop offset=".45" stopColor="#4676f2" /><stop offset="1" stopColor="#234bca" /></linearGradient>
      <linearGradient id={`${id}-cream`} x2=".8" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#f3ecdf" /></linearGradient>
    </defs>
    {drawings[index]}
  </svg>
}
