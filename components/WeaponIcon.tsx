
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
        </svg>
    );
};
