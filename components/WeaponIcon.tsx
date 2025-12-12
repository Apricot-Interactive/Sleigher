

import React from 'react';
import { WeaponType } from '../types.ts';

export const WeaponIcon = ({ type, className }: { type: WeaponType, className?: string }) => {
    return (
        <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            {type === WeaponType.Pistol && (
                <path d="M20,40 L80,40 L80,55 L70,55 L70,85 L45,85 L45,55 L20,55 Z" />
            )}
            {type === WeaponType.Shotgun && (
                <>
                    <path d="M5,45 L95,45 L95,55 L5,55 Z" />
                    <rect x="25" y="58" width="30" height="8" />
                    <path d="M5,55 L15,75 L5,75 L0,55 Z" />
                </>
            )}
            {type === WeaponType.AR && (
                <>
                    <path d="M10,45 L90,45 L90,55 L10,55 Z" />
                    <rect x="50" y="55" width="10" height="20" />
                    <path d="M10,45 L0,65 L15,65 L20,55 Z" />
                    <rect x="55" y="38" width="4" height="7" />
                </>
            )}
            {type === WeaponType.Flamethrower && (
                <>
                    <rect x="20" y="35" width="60" height="30" />
                    <rect x="80" y="45" width="15" height="10" />
                    <path d="M20,45 L5,45 L5,65 L20,55 Z" />
                </>
            )}
            {type === WeaponType.Snowball && (
                 <circle cx="50" cy="50" r="30" />
            )}
            {type === WeaponType.Chainsaw && (
                <>
                    <path d="M10,40 L40,40 L40,30 L90,30 L95,40 L90,50 L40,50 L40,60 L10,60 Z" />
                    <circle cx="25" cy="50" r="5" />
                </>
            )}
            {type === WeaponType.Boomerang && (
                <path d="M10,50 Q50,0 90,50 L80,60 Q50,20 20,60 Z" transform="rotate(-45 50 50)" />
            )}
            {type === WeaponType.Sword && (
                <path d="M20,80 L35,65 L85,15 L90,20 L40,70 L25,85 Z" />
            )}
            {type === WeaponType.Laser && (
                <>
                    <rect x="20" y="40" width="40" height="20" />
                    <rect x="60" y="45" width="30" height="10" />
                    <line x1="90" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" />
                </>
            )}
            {type === WeaponType.GrenadeLauncher && (
                 <>
                    <rect x="10" y="40" width="50" height="20" />
                    <circle cx="60" cy="50" r="15" />
                    <rect x="75" y="45" width="20" height="10" />
                 </>
            )}
            {type === WeaponType.ArcTaser && (
                 <>
                    <rect x="20" y="40" width="40" height="20" />
                    <path d="M60,50 L70,35 L80,65 L90,50" fill="none" stroke="currentColor" strokeWidth="3" />
                 </>
            )}
            {type === WeaponType.Sniper && (
                 <>
                    <rect x="5" y="42" width="75" height="10" />
                    <rect x="80" y="40" width="15" height="14" />
                    <rect x="20" y="32" width="40" height="6" />
                    <rect x="20" y="52" width="10" height="15" />
                    <path d="M5,52 L0,65 L10,65 L15,52 Z" />
                 </>
            )}
        </svg>
    );
};