import * as React from "react"
import { clsx, type ClassValue } from "clsx"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'modern';
}

function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, variant = 'default', ...props }, ref) => {
    const isModern = variant === 'modern';
    
    return (
      <input
        type={type}
        className={cn(
          isModern ? "input-modern" : "flex h-10 w-full px-2 sm:px-3 py-2 text-sm transition-all focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={isModern ? style : {
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-sm)',
          transition: 'var(--transition-base)',
          ...(style || {})
        }}
        onFocus={(e) => {
          if (!isModern) {
            e.currentTarget.style.borderColor = 'var(--color-primary-500)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-100)';
          }
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!isModern) {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.boxShadow = 'none';
          }
          props.onBlur?.(e);
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }