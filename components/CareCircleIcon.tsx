// ============================================================================
// CARE CIRCLE ICON
// Decorative SVG icon showing two people in a warm embrace
// Used in onboarding and family tab
// ============================================================================

import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, RadialGradient } from 'react-native-svg';

interface CareCircleIconProps {
  size?: number;
}

export const CareCircleIcon: React.FC<CareCircleIconProps> = ({ size = 120 }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Defs>
      <LinearGradient id="fig1" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#e07a4a" />
        <Stop offset="100%" stopColor="#d4a656" />
      </LinearGradient>
      <LinearGradient id="fig2" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#d4868a" />
        <Stop offset="100%" stopColor="#c86a6e" />
      </LinearGradient>
      <RadialGradient id="warmGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="rgba(224, 122, 74, 0.3)" />
        <Stop offset="100%" stopColor="transparent" />
      </RadialGradient>
    </Defs>

    {/* Background warm glow */}
    <Circle cx="60" cy="60" r="50" fill="url(#warmGlow)" />

    {/* Decorative curved lines */}
    <Path d="M20 50 Q30 60, 20 70" stroke="#d4a656" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
    <Path d="M100 50 Q90 60, 100 70" stroke="#7cb5a5" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
    <Path d="M50 15 Q60 25, 70 15" stroke="#d4868a" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />

    {/* Figure 1 */}
    <Circle cx="46" cy="40" r="14" fill="url(#fig1)" />
    <Path
      d="M46 54 C46 54, 30 64, 34 85 C36 95, 48 100, 60 94"
      stroke="url(#fig1)"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />

    {/* Figure 2 */}
    <Circle cx="74" cy="40" r="14" fill="url(#fig2)" />
    <Path
      d="M74 54 C74 54, 90 64, 86 85 C84 95, 72 100, 60 94"
      stroke="url(#fig2)"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />

    {/* Heart connection */}
    <Path
      d="M60 92 C60 92, 50 82, 50 74 C50 68, 55 65, 60 72 C65 65, 70 68, 70 74 C70 82, 60 92, 60 92Z"
      fill="#7cb5a5"
      opacity="0.9"
    />

    {/* Floating hearts */}
    <Path d="M28 35 C28 35, 25 32, 25 29 C25 27, 26.5 26, 28 28 C29.5 26, 31 27, 31 29 C31 32, 28 35, 28 35Z" fill="#e07a4a" opacity="0.5" />
    <Path d="M92 35 C92 35, 89 32, 89 29 C89 27, 90.5 26, 92 28 C93.5 26, 95 27, 95 29 C95 32, 92 35, 92 35Z" fill="#7cb5a5" opacity="0.5" />
    <Path d="M60 12 C60 12, 57 9, 57 6 C57 4, 58.5 3, 60 5 C61.5 3, 63 4, 63 6 C63 9, 60 12, 60 12Z" fill="#d4868a" opacity="0.6" />

    {/* Tiny stars */}
    <Circle cx="22" cy="55" r="2" fill="#fff" opacity="0.4" />
    <Circle cx="98" cy="55" r="2" fill="#fff" opacity="0.4" />
    <Circle cx="40" cy="18" r="1.5" fill="#d4a656" opacity="0.5" />
    <Circle cx="80" cy="18" r="1.5" fill="#d4a656" opacity="0.5" />
  </Svg>
);

export default CareCircleIcon;
