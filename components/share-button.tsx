'use client';

import React, { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { useToast } from './toast-provider';

interface ShareButtonProps {
  url: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export default function ShareButton({ 
  url, 
  className = '',
  variant = 'icon'
}: ShareButtonProps) {
  const { showToast } = useToast();
  
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
  
  const handleShare = useCallback(async () => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
      } else {
        // Use fallback method
        const success = fallbackCopyToClipboard(url);
        if (success) {
          showToast('Link copied to clipboard!', 'success');
        } else {
          showToast('Failed to copy link. Please copy manually.', 'error');
        }
      }
    } catch (err) {
      console.error('Primary copy failed, trying fallback:', err);
      // Try fallback if modern API fails
      const success = fallbackCopyToClipboard(url);
      if (success) {
        showToast('Link copied to clipboard!', 'success');
      } else {
        showToast('Failed to copy link. Please copy manually.', 'error');
      }
    }
  }, [url, showToast, fallbackCopyToClipboard]);
  
  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className={`p-2 rounded-lg transition-all hover:scale-105 glass-card ${className}`}
        title="Share location"
        style={{ color: 'var(--text-primary)' }}
      >
        <Share2 className="h-4 w-4" />
      </button>
    );
  }
  
  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-105 glass-card ${className}`}
      style={{ color: 'var(--text-primary)' }}
    >
      <Share2 className="h-4 w-4" />
      <span>Share</span>
    </button>
  );
}