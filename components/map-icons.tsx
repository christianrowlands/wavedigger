import React from 'react';
import { 
  FaMapMarkerAlt,
  FaWifi,
  FaBroadcastTower,
  FaSatelliteDish
} from 'react-icons/fa';
import { 
  HiWifi,
  HiLocationMarker
} from 'react-icons/hi';
import {
  MdRouter,
  MdLocationOn,
  MdSettingsInputAntenna,
  MdWifi,
  MdWifiTethering
} from 'react-icons/md';
import {
  BiWifi,
  BiBroadcast
} from 'react-icons/bi';
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

// Create a location marker with embedded WiFi icon
export function createLocationWifiIcon(
  primaryColor: string,
  size: number = 48
): string {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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
            fill="url(#pin-gradient)" 
            filter="url(#shadow)"/>
      
      <!-- WiFi icon inside pin -->
      <g transform="translate(24, 18)">
        <!-- WiFi waves -->
        <path d="M-12 -4 Q-6 -10 0 -10 Q6 -10 12 -4" 
              fill="none" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round" 
              opacity="0.4"/>
        <path d="M-8 0 Q-4 -6 0 -6 Q4 -6 8 0" 
              fill="none" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round" 
              opacity="0.7"/>
        <path d="M-4 4 Q-2 2 0 2 Q2 2 4 4" 
              fill="none" 
              stroke="white" 
              stroke-width="2.5" 
              stroke-linecap="round"/>
        <circle cx="0" cy="6" r="2" fill="white"/>
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

// Get icon based on preference and theme
export function getMapIcon(
  type: 'location-wifi' | 'router' | 'wifi' | 'broadcast',
  primaryColor: string,
  hoverColor?: string,
  isHovered: boolean = false
): string {
  const color = isHovered && hoverColor ? hoverColor : primaryColor;
  
  switch (type) {
    case 'location-wifi':
      return createLocationWifiIcon(color);
    case 'router':
      return createRouterIcon(color);
    case 'wifi':
      return iconToDataUrl(MdWifiTethering, color);
    case 'broadcast':
      return iconToDataUrl(FaBroadcastTower, color);
    default:
      return createLocationWifiIcon(color);
  }
}