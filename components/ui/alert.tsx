import * as React from "react"
import { clsx, type ClassValue } from "clsx"

function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive'
  }
>(({ className, variant = 'default', style, ...props }, ref) => {
  const variantStyles = {
    default: {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)'
    },
    destructive: {
      background: 'var(--color-error-light)',
      color: 'var(--color-error-dark)',
      border: '1px solid var(--color-error)'
    }
  }
  
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full p-4 animate-slideIn",
        className
      )}
      style={{
        borderRadius: 'var(--radius-lg)',
        ...variantStyles[variant],
        ...(style || {})
      }}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }