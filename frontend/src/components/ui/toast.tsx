import * as React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

import { cn } from '@/lib/utils'

type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

/**
 * Toast — notification transitoire, DS Graphite (classes `.mt-toast`).
 * Bordure gauche colorée par variante + icône. `role="status"` pour l'a11y.
 *
 * #621 — RENDU UNIQUE des toasts de l'application, via react-hot-toast : le moteur
 * (file, durées, retrait) reste la bibliothèque, et `AppToaster` (`ui/toaster.tsx`)
 * rend CHAQUE toast avec ce composant. Ne pas monter un second `<Toaster>` ni un
 * rendu maison : appeler `toast.success(msg)` / `toast.error(msg)` suffit.
 */
export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: ToastVariant
  title: React.ReactNode
  message?: React.ReactNode
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: '',
  success: 'mt-toast--success',
  warning: 'mt-toast--warning',
  danger: 'mt-toast--danger',
}

const VARIANT_ICON: Record<ToastVariant, React.ComponentType<{ 'aria-hidden': boolean }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'info', title, message, ...props }, ref) => {
    const Icon = VARIANT_ICON[variant]
    return (
      <div
        ref={ref}
        role="status"
        className={cn('mt-toast', VARIANT_CLASS[variant], className)}
        {...props}
      >
        <span className="mt-toast__icon">
          <Icon aria-hidden={true} />
        </span>
        <div>
          <div className="mt-toast__title">{title}</div>
          {message != null && <div className="mt-toast__msg">{message}</div>}
        </div>
      </div>
    )
  },
)
Toast.displayName = 'Toast'

export { Toast }
