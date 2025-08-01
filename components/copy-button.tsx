'use client';

import React, { useCallback, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './toast-provider';
import { useAnalytics } from '@/hooks/use-analytics';

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
  analyticsType?: 'bssid' | 'location';
  analyticsSource?: 'selected_marker' | 'mobile_sheet';
}

export default function CopyButton({ 
  text, 
  className = '',
  label = 'Copy',
  size = 'sm',
  analyticsType,
  analyticsSource
}: CopyButtonProps) {
  const { showToast } = useToast();
  const { trackCopyAction } = useAnalytics();
  const [copied, setCopied] = useState(false);
  
  // Fallback method using execCommand
  const fallbackCopyToClipboard = useCallback((text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
    return success;
  }, []);
  
  const handleCopy = useCallback(async () => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showToast(`${label} copied!`, 'success');
        // Track analytics if props are provided
        if (analyticsType && analyticsSource) {
          trackCopyAction(analyticsType, analyticsSource);
        }
      } else {
        // Use fallback method
        const success = fallbackCopyToClipboard(text);
        if (success) {
          setCopied(true);
          showToast(`${label} copied!`, 'success');
          // Track analytics if props are provided
          if (analyticsType && analyticsSource) {
            trackCopyAction(analyticsType, analyticsSource);
          }
        } else {
          showToast(`Failed to copy ${label.toLowerCase()}.`, 'error');
        }
      }
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Primary copy failed, trying fallback:', err);
      // Try fallback if modern API fails
      const success = fallbackCopyToClipboard(text);
      if (success) {
        setCopied(true);
        showToast(`${label} copied!`, 'success');
        // Track analytics if props are provided
        if (analyticsType && analyticsSource) {
          trackCopyAction(analyticsType, analyticsSource);
        }
        setTimeout(() => setCopied(false), 2000);
      } else {
        showToast(`Failed to copy ${label.toLowerCase()}.`, 'error');
      }
    }
  }, [text, label, showToast, fallbackCopyToClipboard, analyticsType, analyticsSource, trackCopyAction]);
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const padding = size === 'sm' ? 'p-1' : 'p-1.5';
  
  return (
    <button
      onClick={handleCopy}
      className={`${padding} rounded transition-all hover:scale-110 glass-card ${className}`}
      title={`Copy ${label.toLowerCase()}`}
      style={{ 
        color: copied ? 'var(--color-success)' : 'var(--text-tertiary)',
        background: 'var(--bg-tertiary)'
      }}
    >
      {copied ? (
        <Check className={iconSize} />
      ) : (
        <Copy className={iconSize} />
      )}
    </button>
  );
}