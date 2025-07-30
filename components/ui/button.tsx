import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { clsx, type ClassValue } from "clsx"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const variantStyles = {
      default: {
        background: 'var(--color-primary-500)',
        color: 'white',
        hover: {
          background: 'var(--color-primary-600)',
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-md)'
        }
      },
      destructive: {
        background: 'var(--color-error)',
        color: 'white',
        hover: {
          background: 'var(--color-error-dark)',
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-md)'
        }
      },
      outline: {
        background: 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-primary)',
        hover: {
          background: 'var(--bg-hover)',
          borderColor: 'var(--color-primary-300)'
        }
      },
      secondary: {
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        hover: {
          background: 'var(--bg-hover)',
          transform: 'translateY(-1px)'
        }
      },
      ghost: {
        background: 'transparent',
        color: 'var(--text-primary)',
        hover: {
          background: 'var(--bg-hover)',
          color: 'var(--text-primary)'
        }
      },
      link: {
        background: 'transparent',
        color: 'var(--color-primary-500)',
        textDecoration: 'underline',
        textUnderlineOffset: '4px',
        hover: {
          color: 'var(--color-primary-600)'
        }
      }
    }
    
    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3 text-sm",
      lg: "h-11 px-8 text-base",
      icon: "h-10 w-10"
    }
    
    const styles = variantStyles[variant] || variantStyles.default
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-ring disabled:pointer-events-none disabled:opacity-50",
          sizeStyles[size],
          className
        )}
        style={{
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--text-sm)',
          transition: 'var(--transition-base)',
          ...styles,
          ...(props.disabled ? {} : {
            ':hover': styles.hover
          })
        }}
        ref={ref}
        {...props}
        onMouseEnter={(e) => {
          if (!props.disabled && styles.hover) {
            Object.assign(e.currentTarget.style, styles.hover)
          }
          props.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          if (!props.disabled) {
            Object.assign(e.currentTarget.style, {
              background: styles.background,
              color: styles.color,
              border: styles.border,
              transform: 'translateY(0)',
              boxShadow: 'none',
              textDecoration: styles.textDecoration,
              textUnderlineOffset: styles.textUnderlineOffset
            })
          }
          props.onMouseLeave?.(e)
        }}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }