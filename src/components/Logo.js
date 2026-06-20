export default function Logo({ variant = 'dark', height = 36, showTagline = false }) {
  if (variant === 'dark') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height={height} viewBox="0 0 400 160" style={{ display: 'block' }}>
        <circle cx="44" cy="80" r="14" fill="#5DCAA5"/>
        <circle cx="92" cy="34" r="10" fill="#5DCAA5" opacity="0.65"/>
        <circle cx="92" cy="126" r="10" fill="#5DCAA5" opacity="0.65"/>
        <line x1="56" y1="71" x2="82" y2="42" stroke="#5DCAA5" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
        <line x1="56" y1="89" x2="82" y2="118" stroke="#5DCAA5" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
        <text x="120" y="98" fontFamily="DM Sans, Arial, sans-serif" fontSize="64" fontWeight="700" fill="#F0EDE6" letterSpacing="-2">Rovi</text>
        {showTagline && <text x="122" y="122" fontFamily="DM Sans, Arial, sans-serif" fontSize="14" fontWeight="400" fill="#5F5E5A" letterSpacing="3">PLATFORM</text>}
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height={height} viewBox="0 0 400 160" style={{ display: 'block' }}>
      <circle cx="44" cy="80" r="14" fill="#0F6E56"/>
      <circle cx="92" cy="34" r="10" fill="#0F6E56" opacity="0.65"/>
      <circle cx="92" cy="126" r="10" fill="#0F6E56" opacity="0.65"/>
      <line x1="56" y1="71" x2="82" y2="42" stroke="#0F6E56" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
      <line x1="56" y1="89" x2="82" y2="118" stroke="#0F6E56" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
      <text x="120" y="98" fontFamily="DM Sans, Arial, sans-serif" fontSize="64" fontWeight="700" fill="#1C1C1A" letterSpacing="-2">Rovi</text>
      {showTagline && <text x="122" y="122" fontFamily="DM Sans, Arial, sans-serif" fontSize="14" fontWeight="400" fill="#A8A8A2" letterSpacing="3">PLATFORM</text>}
    </svg>
  )
}
