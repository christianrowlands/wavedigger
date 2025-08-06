import React from 'react';
import { 
  FaBroadcastTower,
} from 'react-icons/fa';
import {
  MdWifiTethering
} from 'react-icons/md';
import { renderToString } from 'react-dom/server';

// Helper to convert React icon to data URL
export function iconToDataUrl(
  IconComponent: React.ComponentType<{ size?: number; color?: string }>,
  color: string,
  size: number = 48
): string {
  const svgString = renderToString(
    <IconComponent size={size} color={color} />
  );
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

// Create a simple location pin marker
export function createLocationPin(
  primaryColor: string,
  size: number = 48,
  fillColor?: string,
  isSelected: boolean = false
): string {
  const viewBox = isSelected ? "0 0 72 84" : "0 0 48 48";
  const scale = isSelected ? 1.5 : 1;
  const cx = isSelected ? 36 : 24;
  const cy = isSelected ? 27 : 18;
  
  const svg = isSelected ? `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <!-- Location pin shape (no shadow for selected) -->
      <path d="M${cx} ${3*scale} C${cx - 13.163*scale} ${3*scale} ${cx - 16*scale} ${12.163*scale} ${cx - 16*scale} ${cy} C${cx - 16*scale} ${cy + 16.5*scale} ${cx} ${cx + 28*scale} ${cx} ${cx + 28*scale} S${cx + 16*scale} ${cy + 16.5*scale} ${cx + 16*scale} ${cy} C${cx + 16*scale} ${12.163*scale} ${cx + 13.163*scale} ${3*scale} ${cx} ${3*scale} Z" 
            fill="${fillColor || primaryColor}" />
      
      <!-- Solid white center circle -->
      <circle cx="${cx}" cy="${cy}" r="${9*scale}" fill="white" />
      
      <!-- Inner colored circle for visibility -->
      <circle cx="${cx}" cy="${cy}" r="${4*scale}" fill="${primaryColor}" />
    </svg>
  ` : `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.8" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
      </defs>
      
      <!-- Location pin shape -->
      <path d="M24 2 C15.163 2 8 9.163 8 18 C8 29 24 46 24 46 S40 29 40 18 C40 9.163 32.837 2 24 2 Z" 
            fill="${fillColor || 'url(#pin-gradient)'}" 
            filter="url(#shadow)"/>
      
      <!-- Simple center circle -->
      <circle cx="24" cy="18" r="6" fill="white" opacity="0.9"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Create a location pin with China indicator
export function createLocationPinChina(
  primaryColor: string,
  size: number = 48,
  fillColor?: string,
  isSelected: boolean = false
): string {
  const viewBox = isSelected ? "0 0 72 84" : "0 0 48 48";
  const scale = isSelected ? 1.5 : 1;
  const cx = isSelected ? 36 : 24;
  const cy = isSelected ? 27 : 18;
  const flagX = isSelected ? 45 : 30;
  const flagY = isSelected ? 4.5 : 3;
  const flagSize = isSelected ? 12 : 8;
  
  const svg = isSelected ? `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <!-- Location pin shape (no shadow for selected) -->
      <path d="M${cx} ${3*scale} C${cx - 13.163*scale} ${3*scale} ${cx - 16*scale} ${12.163*scale} ${cx - 16*scale} ${cy} C${cx - 16*scale} ${cy + 16.5*scale} ${cx} ${cx + 28*scale} ${cx} ${cx + 28*scale} S${cx + 16*scale} ${cy + 16.5*scale} ${cx + 16*scale} ${cy} C${cx + 16*scale} ${12.163*scale} ${cx + 13.163*scale} ${3*scale} ${cx} ${3*scale} Z" 
            fill="${fillColor || primaryColor}" />
      
      <!-- Solid white center circle -->
      <circle cx="${cx}" cy="${cy}" r="${9*scale}" fill="white" />
      
      <!-- Inner colored circle for visibility -->
      <circle cx="${cx}" cy="${cy}" r="${4*scale}" fill="${primaryColor}" />
      
      <!-- China flag indicator -->
      <g transform="translate(${flagX}, ${flagY})">
        <circle cx="${flagSize}" cy="${flagSize}" r="${flagSize}" fill="#EE1C25" stroke="white" stroke-width="1.5"/>
        <text x="${flagSize}" y="${flagSize + 6}" text-anchor="middle" font-size="${isSelected ? 15 : 10}" font-weight="bold" fill="white">CN</text>
      </g>
    </svg>
  ` : `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.8" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
      </defs>
      
      <!-- Location pin shape -->
      <path d="M24 2 C15.163 2 8 9.163 8 18 C8 29 24 46 24 46 S40 29 40 18 C40 9.163 32.837 2 24 2 Z" 
            fill="${fillColor || 'url(#pin-gradient)'}" 
            filter="url(#shadow)"/>
      
      <!-- Simple center circle -->
      <circle cx="24" cy="18" r="6" fill="white" opacity="0.9"/>
      
      <!-- China flag indicator -->
      <g transform="translate(30, 3)">
        <circle cx="8" cy="8" r="8" fill="#EE1C25" stroke="white" stroke-width="1"/>
        <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="white">CN</text>
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Modern router icon design
export function createRouterIcon(
  primaryColor: string,
  size: number = 48
): string {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="router-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.7" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
      </defs>
      
      <!-- Router body -->
      <rect x="8" y="24" width="32" height="16" rx="4" 
            fill="url(#router-gradient)" 
            filter="url(#shadow)"/>
      
      <!-- Signal waves -->
      <path d="M24 20 Q16 12 8 12 Q16 4 24 4 Q32 4 40 12 Q32 12 24 20" 
            fill="none" 
            stroke="${primaryColor}" 
            stroke-width="2" 
            stroke-linecap="round" 
            opacity="0.4"/>
      <path d="M24 18 Q18 12 12 12 Q18 6 24 6 Q30 6 36 12 Q30 12 24 18" 
            fill="none" 
            stroke="${primaryColor}" 
            stroke-width="2" 
            stroke-linecap="round" 
            opacity="0.6"/>
      <path d="M24 16 Q20 12 16 12 Q20 8 24 8 Q28 8 32 12 Q28 12 24 16" 
            fill="none" 
            stroke="${primaryColor}" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            opacity="0.8"/>
      
      <!-- Status lights -->
      <circle cx="16" cy="32" r="2" fill="white" opacity="0.8"/>
      <circle cx="24" cy="32" r="2" fill="white"/>
      <circle cx="32" cy="32" r="2" fill="white" opacity="0.8"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Create a cell tower icon (based on Android vector drawable)
export function createCellTowerIcon(
  primaryColor: string,
  size: number = 48,
  isSelected: boolean = false
): string {
  const viewBox = isSelected ? "0 0 72 72" : "0 0 48 48";
  const scale = isSelected ? 3 : 2;
  
  const svg = isSelected ? `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <!-- Left inner signal wave -->
      <path d="M${7.3*scale},${14.7*scale}l${1.2*scale},-${1.2*scale}c-${1*scale},-${1*scale} -${1.5*scale},-${2.3*scale} -${1.5*scale},-${3.5*scale}c0,-${1.3*scale} ${0.5*scale},-${2.6*scale} ${1.5*scale},-${3.5*scale}L${7.3*scale},${5.3*scale}c-${1.3*scale},${1.3*scale} -${2*scale},${3*scale} -${2*scale},${4.7*scale}S${6*scale},${13.4*scale} ${7.3*scale},${14.7*scale}z" 
            fill="${primaryColor}" opacity="0.7"/>
      
      <!-- Right outer signal wave -->
      <path d="M${19.1*scale},${2.9*scale}l-${1.2*scale},${1.2*scale}c${1.6*scale},${1.6*scale} ${2.4*scale},${3.8*scale} ${2.4*scale},${5.9*scale}c0,${2.1*scale} -${0.8*scale},${4.3*scale} -${2.4*scale},${5.9*scale}l${1.2*scale},${1.2*scale}c${2*scale},-${2*scale} ${2.9*scale},-${4.5*scale} ${2.9*scale},-${7.1*scale}C${22*scale},${7.4*scale} ${21*scale},${4.9*scale} ${19.1*scale},${2.9*scale}z" 
            fill="${primaryColor}" opacity="0.5"/>
      
      <!-- Left outer signal wave -->
      <path d="M${6.1*scale},${4.1*scale}L${4.9*scale},${2.9*scale}C${3*scale},${4.9*scale} ${2*scale},${7.4*scale} ${2*scale},${10*scale}c0,${2.6*scale} ${1*scale},${5.1*scale} ${2.9*scale},${7.1*scale}l${1.2*scale},-${1.2*scale}c-${1.6*scale},-${1.6*scale} -${2.4*scale},-${3.8*scale} -${2.4*scale},-${5.9*scale}C${3.7*scale},${7.9*scale} ${4.5*scale},${5.7*scale} ${6.1*scale},${4.1*scale}z" 
            fill="${primaryColor}" opacity="0.5"/>
      
      <!-- Right inner signal wave -->
      <path d="M${16.7*scale},${14.7*scale}c${1.3*scale},-${1.3*scale} ${2*scale},-${3*scale} ${2*scale},-${4.7*scale}c-${0.1*scale},-${1.7*scale} -${0.7*scale},-${3.4*scale} -${2*scale},-${4.7*scale}l-${1.2*scale},${1.2*scale}c${1*scale},${1*scale} ${1.5*scale},${2.3*scale} ${1.5*scale},${3.5*scale}c0,${1.3*scale} -${0.5*scale},${2.6*scale} -${1.5*scale},${3.5*scale}L${16.7*scale},${14.7*scale}z" 
            fill="${primaryColor}" opacity="0.7"/>
      
      <!-- Tower and antenna structure -->
      <path d="M${14.5*scale},${10*scale}c0,-${1.38*scale} -${1.12*scale},-${2.5*scale} -${2.5*scale},-${2.5*scale}S${9.5*scale},${8.62*scale} ${9.5*scale},${10*scale}c0,${0.76*scale} ${0.34*scale},${1.42*scale} ${0.87*scale},${1.88*scale}L${7*scale},${22*scale}h${2*scale}l${0.67*scale},-${2*scale}h${4.67*scale}L${15*scale},${22*scale}h${2*scale}l-${3.37*scale},-${10.12*scale}C${14.16*scale},${11.42*scale} ${14.5*scale},${10.76*scale} ${14.5*scale},${10*scale}zM${10.33*scale},${18*scale}L${12*scale},${13*scale}l${1.67*scale},${5*scale}H${10.33*scale}z" 
            fill="${primaryColor}"/>
    </svg>
  ` : `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tower-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.8" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
      </defs>
      
      <!-- Left inner signal wave -->
      <path d="M${7.3*scale},${14.7*scale}l${1.2*scale},-${1.2*scale}c-${1*scale},-${1*scale} -${1.5*scale},-${2.3*scale} -${1.5*scale},-${3.5*scale}c0,-${1.3*scale} ${0.5*scale},-${2.6*scale} ${1.5*scale},-${3.5*scale}L${7.3*scale},${5.3*scale}c-${1.3*scale},${1.3*scale} -${2*scale},${3*scale} -${2*scale},${4.7*scale}S${6*scale},${13.4*scale} ${7.3*scale},${14.7*scale}z" 
            fill="url(#tower-gradient)" opacity="0.7" filter="url(#shadow)"/>
      
      <!-- Right outer signal wave -->
      <path d="M${19.1*scale},${2.9*scale}l-${1.2*scale},${1.2*scale}c${1.6*scale},${1.6*scale} ${2.4*scale},${3.8*scale} ${2.4*scale},${5.9*scale}c0,${2.1*scale} -${0.8*scale},${4.3*scale} -${2.4*scale},${5.9*scale}l${1.2*scale},${1.2*scale}c${2*scale},-${2*scale} ${2.9*scale},-${4.5*scale} ${2.9*scale},-${7.1*scale}C${22*scale},${7.4*scale} ${21*scale},${4.9*scale} ${19.1*scale},${2.9*scale}z" 
            fill="url(#tower-gradient)" opacity="0.5" filter="url(#shadow)"/>
      
      <!-- Left outer signal wave -->
      <path d="M${6.1*scale},${4.1*scale}L${4.9*scale},${2.9*scale}C${3*scale},${4.9*scale} ${2*scale},${7.4*scale} ${2*scale},${10*scale}c0,${2.6*scale} ${1*scale},${5.1*scale} ${2.9*scale},${7.1*scale}l${1.2*scale},-${1.2*scale}c-${1.6*scale},-${1.6*scale} -${2.4*scale},-${3.8*scale} -${2.4*scale},-${5.9*scale}C${3.7*scale},${7.9*scale} ${4.5*scale},${5.7*scale} ${6.1*scale},${4.1*scale}z" 
            fill="url(#tower-gradient)" opacity="0.5" filter="url(#shadow)"/>
      
      <!-- Right inner signal wave -->
      <path d="M${16.7*scale},${14.7*scale}c${1.3*scale},-${1.3*scale} ${2*scale},-${3*scale} ${2*scale},-${4.7*scale}c-${0.1*scale},-${1.7*scale} -${0.7*scale},-${3.4*scale} -${2*scale},-${4.7*scale}l-${1.2*scale},${1.2*scale}c${1*scale},${1*scale} ${1.5*scale},${2.3*scale} ${1.5*scale},${3.5*scale}c0,${1.3*scale} -${0.5*scale},${2.6*scale} -${1.5*scale},${3.5*scale}L${16.7*scale},${14.7*scale}z" 
            fill="url(#tower-gradient)" opacity="0.7" filter="url(#shadow)"/>
      
      <!-- Tower and antenna structure -->
      <path d="M${14.5*scale},${10*scale}c0,-${1.38*scale} -${1.12*scale},-${2.5*scale} -${2.5*scale},-${2.5*scale}S${9.5*scale},${8.62*scale} ${9.5*scale},${10*scale}c0,${0.76*scale} ${0.34*scale},${1.42*scale} ${0.87*scale},${1.88*scale}L${7*scale},${22*scale}h${2*scale}l${0.67*scale},-${2*scale}h${4.67*scale}L${15*scale},${22*scale}h${2*scale}l-${3.37*scale},-${10.12*scale}C${14.16*scale},${11.42*scale} ${14.5*scale},${10.76*scale} ${14.5*scale},${10*scale}zM${10.33*scale},${18*scale}L${12*scale},${13*scale}l${1.67*scale},${5*scale}H${10.33*scale}z" 
            fill="url(#tower-gradient)" filter="url(#shadow)"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Create a cell tower icon with China indicator (based on Android vector drawable)
export function createCellTowerIconChina(
  primaryColor: string,
  size: number = 48,
  isSelected: boolean = false
): string {
  const viewBox = isSelected ? "0 0 72 72" : "0 0 48 48";
  const scale = isSelected ? 3 : 2;
  const flagX = isSelected ? 45 : 30;
  const flagY = isSelected ? 4.5 : 3;
  const flagSize = isSelected ? 12 : 8;
  
  const svg = isSelected ? `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <!-- Left inner signal wave -->
      <path d="M${7.3*scale},${14.7*scale}l${1.2*scale},-${1.2*scale}c-${1*scale},-${1*scale} -${1.5*scale},-${2.3*scale} -${1.5*scale},-${3.5*scale}c0,-${1.3*scale} ${0.5*scale},-${2.6*scale} ${1.5*scale},-${3.5*scale}L${7.3*scale},${5.3*scale}c-${1.3*scale},${1.3*scale} -${2*scale},${3*scale} -${2*scale},${4.7*scale}S${6*scale},${13.4*scale} ${7.3*scale},${14.7*scale}z" 
            fill="${primaryColor}" opacity="0.7"/>
      
      <!-- Right outer signal wave -->
      <path d="M${19.1*scale},${2.9*scale}l-${1.2*scale},${1.2*scale}c${1.6*scale},${1.6*scale} ${2.4*scale},${3.8*scale} ${2.4*scale},${5.9*scale}c0,${2.1*scale} -${0.8*scale},${4.3*scale} -${2.4*scale},${5.9*scale}l${1.2*scale},${1.2*scale}c${2*scale},-${2*scale} ${2.9*scale},-${4.5*scale} ${2.9*scale},-${7.1*scale}C${22*scale},${7.4*scale} ${21*scale},${4.9*scale} ${19.1*scale},${2.9*scale}z" 
            fill="${primaryColor}" opacity="0.5"/>
      
      <!-- Left outer signal wave -->
      <path d="M${6.1*scale},${4.1*scale}L${4.9*scale},${2.9*scale}C${3*scale},${4.9*scale} ${2*scale},${7.4*scale} ${2*scale},${10*scale}c0,${2.6*scale} ${1*scale},${5.1*scale} ${2.9*scale},${7.1*scale}l${1.2*scale},-${1.2*scale}c-${1.6*scale},-${1.6*scale} -${2.4*scale},-${3.8*scale} -${2.4*scale},-${5.9*scale}C${3.7*scale},${7.9*scale} ${4.5*scale},${5.7*scale} ${6.1*scale},${4.1*scale}z" 
            fill="${primaryColor}" opacity="0.5"/>
      
      <!-- Right inner signal wave -->
      <path d="M${16.7*scale},${14.7*scale}c${1.3*scale},-${1.3*scale} ${2*scale},-${3*scale} ${2*scale},-${4.7*scale}c-${0.1*scale},-${1.7*scale} -${0.7*scale},-${3.4*scale} -${2*scale},-${4.7*scale}l-${1.2*scale},${1.2*scale}c${1*scale},${1*scale} ${1.5*scale},${2.3*scale} ${1.5*scale},${3.5*scale}c0,${1.3*scale} -${0.5*scale},${2.6*scale} -${1.5*scale},${3.5*scale}L${16.7*scale},${14.7*scale}z" 
            fill="${primaryColor}" opacity="0.7"/>
      
      <!-- Tower and antenna structure -->
      <path d="M${14.5*scale},${10*scale}c0,-${1.38*scale} -${1.12*scale},-${2.5*scale} -${2.5*scale},-${2.5*scale}S${9.5*scale},${8.62*scale} ${9.5*scale},${10*scale}c0,${0.76*scale} ${0.34*scale},${1.42*scale} ${0.87*scale},${1.88*scale}L${7*scale},${22*scale}h${2*scale}l${0.67*scale},-${2*scale}h${4.67*scale}L${15*scale},${22*scale}h${2*scale}l-${3.37*scale},-${10.12*scale}C${14.16*scale},${11.42*scale} ${14.5*scale},${10.76*scale} ${14.5*scale},${10*scale}zM${10.33*scale},${18*scale}L${12*scale},${13*scale}l${1.67*scale},${5*scale}H${10.33*scale}z" 
            fill="${primaryColor}"/>
      
      <!-- China flag indicator -->
      <g transform="translate(${flagX}, ${flagY})">
        <circle cx="${flagSize}" cy="${flagSize}" r="${flagSize}" fill="#EE1C25" stroke="white" stroke-width="1.5"/>
        <text x="${flagSize}" y="${flagSize + 6}" text-anchor="middle" font-size="${isSelected ? 15 : 10}" font-weight="bold" fill="white">CN</text>
      </g>
    </svg>
  ` : `
    <svg width="${size}" height="${size}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tower-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.8" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
        </filter>
      </defs>
      
      <!-- Left inner signal wave -->
      <path d="M${7.3*scale},${14.7*scale}l${1.2*scale},-${1.2*scale}c-${1*scale},-${1*scale} -${1.5*scale},-${2.3*scale} -${1.5*scale},-${3.5*scale}c0,-${1.3*scale} ${0.5*scale},-${2.6*scale} ${1.5*scale},-${3.5*scale}L${7.3*scale},${5.3*scale}c-${1.3*scale},${1.3*scale} -${2*scale},${3*scale} -${2*scale},${4.7*scale}S${6*scale},${13.4*scale} ${7.3*scale},${14.7*scale}z" 
            fill="url(#tower-gradient)" opacity="0.7" filter="url(#shadow)"/>
      
      <!-- Right outer signal wave -->
      <path d="M${19.1*scale},${2.9*scale}l-${1.2*scale},${1.2*scale}c${1.6*scale},${1.6*scale} ${2.4*scale},${3.8*scale} ${2.4*scale},${5.9*scale}c0,${2.1*scale} -${0.8*scale},${4.3*scale} -${2.4*scale},${5.9*scale}l${1.2*scale},${1.2*scale}c${2*scale},-${2*scale} ${2.9*scale},-${4.5*scale} ${2.9*scale},-${7.1*scale}C${22*scale},${7.4*scale} ${21*scale},${4.9*scale} ${19.1*scale},${2.9*scale}z" 
            fill="url(#tower-gradient)" opacity="0.5" filter="url(#shadow)"/>
      
      <!-- Left outer signal wave -->
      <path d="M${6.1*scale},${4.1*scale}L${4.9*scale},${2.9*scale}C${3*scale},${4.9*scale} ${2*scale},${7.4*scale} ${2*scale},${10*scale}c0,${2.6*scale} ${1*scale},${5.1*scale} ${2.9*scale},${7.1*scale}l${1.2*scale},-${1.2*scale}c-${1.6*scale},-${1.6*scale} -${2.4*scale},-${3.8*scale} -${2.4*scale},-${5.9*scale}C${3.7*scale},${7.9*scale} ${4.5*scale},${5.7*scale} ${6.1*scale},${4.1*scale}z" 
            fill="url(#tower-gradient)" opacity="0.5" filter="url(#shadow)"/>
      
      <!-- Right inner signal wave -->
      <path d="M${16.7*scale},${14.7*scale}c${1.3*scale},-${1.3*scale} ${2*scale},-${3*scale} ${2*scale},-${4.7*scale}c-${0.1*scale},-${1.7*scale} -${0.7*scale},-${3.4*scale} -${2*scale},-${4.7*scale}l-${1.2*scale},${1.2*scale}c${1*scale},${1*scale} ${1.5*scale},${2.3*scale} ${1.5*scale},${3.5*scale}c0,${1.3*scale} -${0.5*scale},${2.6*scale} -${1.5*scale},${3.5*scale}L${16.7*scale},${14.7*scale}z" 
            fill="url(#tower-gradient)" opacity="0.7" filter="url(#shadow)"/>
      
      <!-- Tower and antenna structure -->
      <path d="M${14.5*scale},${10*scale}c0,-${1.38*scale} -${1.12*scale},-${2.5*scale} -${2.5*scale},-${2.5*scale}S${9.5*scale},${8.62*scale} ${9.5*scale},${10*scale}c0,${0.76*scale} ${0.34*scale},${1.42*scale} ${0.87*scale},${1.88*scale}L${7*scale},${22*scale}h${2*scale}l${0.67*scale},-${2*scale}h${4.67*scale}L${15*scale},${22*scale}h${2*scale}l-${3.37*scale},-${10.12*scale}C${14.16*scale},${11.42*scale} ${14.5*scale},${10.76*scale} ${14.5*scale},${10*scale}zM${10.33*scale},${18*scale}L${12*scale},${13*scale}l${1.67*scale},${5*scale}H${10.33*scale}z" 
            fill="url(#tower-gradient)" filter="url(#shadow)"/>
      
      <!-- China flag indicator -->
      <g transform="translate(30, 3)">
        <circle cx="8" cy="8" r="8" fill="#EE1C25" stroke="white" stroke-width="1"/>
        <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="white">CN</text>
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Get icon based on preference and theme
export function getMapIcon(
  type: 'location-pin' | 'location-pin-china' | 'router' | 'wifi' | 'broadcast' | 'cell-tower' | 'cell-tower-china',
  primaryColor: string,
  hoverColor?: string,
  isHovered: boolean = false,
  fillColor?: string,
  isSelected: boolean = false,
  size: number = 48
): string {
  const color = isHovered && hoverColor ? hoverColor : primaryColor;
  
  switch (type) {
    case 'location-pin':
      return createLocationPin(color, size, fillColor, isSelected);
    case 'location-pin-china':
      return createLocationPinChina(color, size, fillColor, isSelected);
    case 'cell-tower':
      return createCellTowerIcon(color, size, isSelected);
    case 'cell-tower-china':
      return createCellTowerIconChina(color, size, isSelected);
    case 'router':
      return createRouterIcon(color, size);
    case 'wifi':
      return iconToDataUrl(MdWifiTethering, color, size);
    case 'broadcast':
      return iconToDataUrl(FaBroadcastTower, color, size);
    default:
      return createLocationPin(color, size, fillColor, isSelected);
  }
}