// Rovi Logo Component
// Usage: <Logo variant="light" height={40} /> or <Logo variant="dark" height={32} />

export default function Logo({ variant = 'dark', height = 36, showTagline = false }) {

  // Dark version — for dark sidebars (white text, teal accent)
  if (variant === 'dark') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height={height} viewBox="0 0 320 120" style={{ display: 'block' }}>
        <circle cx="22" cy="60" r="11" fill="#5DCAA5"/>
        <circle cx="58" cy="26" r="8" fill="#5DCAA5" opacity="0.65"/>
        <circle cx="58" cy="94" r="8" fill="#5DCAA5" opacity="0.65"/>
        <line x1="31" y1="53" x2="51" y2="33" stroke="#5DCAA5" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/>
        <line x1="31" y1="67" x2="51" y2="87" stroke="#5DCAA5" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/>
        <text x="74" y="78" fontFamily="DM Sans, Arial, sans-serif" fontSize="56" fontWeight="700" fill="#F0EDE6" letterSpacing="-1">Rovi</text>
        {showTagline && <text x="76" y="100" fontFamily="DM Sans, Arial, sans-serif" fontSize="11" fontWeight="400" fill="#5F5E5A" letterSpacing="3">PLATFORM</text>}
      </svg>
    )
  }

  // Light version — for light backgrounds (dark text, green accent)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height={height} viewBox="0 0 320 120" style={{ display: 'block' }}>
      <circle cx="22" cy="60" r="11" fill="#0F6E56"/>
      <circle cx="58" cy="26" r="8" fill="#0F6E56" opacity="0.65"/>
      <circle cx="58" cy="94" r="8" fill="#0F6E56" opacity="0.65"/>
      <line x1="31" y1="53" x2="51" y2="33" stroke="#0F6E56" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/>
      <line x1="31" y1="67" x2="51" y2="87" stroke="#0F6E56" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/>
      <text x="74" y="78" fontFamily="DM Sans, Arial, sans-serif" fontSize="56" fontWeight="700" fill="#1C1C1A" letterSpacing="-1">Rovi</text>
      {showTagline && <text x="76" y="100" fontFamily="DM Sans, Arial, sans-serif" fontSize="11" fontWeight="400" fill="#5F5E5A" letterSpacing="3">PLATFORM</text>}
    </svg>
  )
}
