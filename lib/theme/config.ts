/**
 * Theme configuration for the BSSID Location Search app
 * Centralizes all theme-related constants and utilities
 */

export interface ThemeColors {
  // Base colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgSidebar: string;
  
  // Cards
  bgCardPrimary: string;
  bgCardSecondary: string;
  bgCardAccent: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Borders
  borderPrimary: string;
  borderSecondary: string;
  
  // Gradients
  gradientButtonPrimary: string;
  gradientButtonSecondary: string;
  gradientButtonAccent: string;
  gradientCard1: string;
  gradientCard2: string;
  gradientCard3: string;
  
  // Glass effects
  glassBackground: string;
  glassBorder: string;
  
  // Icon colors
  iconGradientStart: string;
  iconGradientEnd: string;
  iconHoverGradientStart: string;
  iconHoverGradientEnd: string;
  
  // Shadows
  shadowPrimary: string;
  shadowSecondary: string;
  shadowAccent: string;
}

export type Theme = 'light' | 'dark' | 'system';

/**
 * Get the current theme colors from CSS variables
 */
export function getThemeColors(): ThemeColors {
  const computedStyle = getComputedStyle(document.documentElement);
  
  const getVar = (name: string): string => {
    return computedStyle.getPropertyValue(name).trim();
  };
  
  return {
    // Base colors
    primary: getVar('--color-primary-500'),
    secondary: getVar('--color-secondary-500'),
    accent: getVar('--color-accent-500'),
    
    // Backgrounds
    bgPrimary: getVar('--bg-primary'),
    bgSecondary: getVar('--bg-secondary'),
    bgTertiary: getVar('--bg-tertiary'),
    bgSidebar: getVar('--bg-sidebar'),
    
    // Cards
    bgCardPrimary: getVar('--bg-card-primary'),
    bgCardSecondary: getVar('--bg-card-secondary'),
    bgCardAccent: getVar('--bg-card-accent'),
    
    // Text
    textPrimary: getVar('--text-primary'),
    textSecondary: getVar('--text-secondary'),
    textTertiary: getVar('--text-tertiary'),
    
    // Borders
    borderPrimary: getVar('--border-primary'),
    borderSecondary: getVar('--border-secondary'),
    
    // Gradients
    gradientButtonPrimary: getVar('--gradient-button-primary'),
    gradientButtonSecondary: getVar('--gradient-button-secondary'),
    gradientButtonAccent: getVar('--gradient-button-accent'),
    gradientCard1: getVar('--gradient-card-1'),
    gradientCard2: getVar('--gradient-card-2'),
    gradientCard3: getVar('--gradient-card-3'),
    
    // Glass effects
    glassBackground: getVar('--glass-background'),
    glassBorder: getVar('--glass-border'),
    
    // Icon colors
    iconGradientStart: getVar('--icon-gradient-start'),
    iconGradientEnd: getVar('--icon-gradient-end'),
    iconHoverGradientStart: getVar('--icon-hover-gradient-start'),
    iconHoverGradientEnd: getVar('--icon-hover-gradient-end'),
    
    // Shadows
    shadowPrimary: getVar('--shadow-primary'),
    shadowSecondary: getVar('--shadow-secondary'),
    shadowAccent: getVar('--shadow-accent'),
  };
}

/**
 * Get the resolved theme (light or dark) based on current settings
 */
export function getResolvedTheme(): 'light' | 'dark' {
  const dataTheme = document.documentElement.getAttribute('data-theme');
  return dataTheme === 'dark' ? 'dark' : 'light';
}

/**
 * Watch for theme changes
 */
export function watchTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  const observer = new MutationObserver(() => {
    callback(getResolvedTheme());
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  
  // Call immediately with current theme
  callback(getResolvedTheme());
  
  // Return cleanup function
  return () => observer.disconnect();
}