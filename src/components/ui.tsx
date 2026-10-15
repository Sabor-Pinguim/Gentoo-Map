import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import * as RTooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { registerConfirmHandler, type ConfirmOptions } from '../state/actions';

/* ---------- Tooltip ---------- */

export const TooltipProvider = RTooltip.Provider;

export function Tooltip({
  label,
  shortcut,
  children,
  side = 'bottom',
}: {
  label: ReactNode;
  shortcut?: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <RTooltip.Provider delayDuration={200}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content className="tooltip" side={side} sideOffset={6} collisionPadding={8}>
            <span>{label}</span>
            {shortcut && <span className="kbd-hint">{shortcut}</span>}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

/* ---------- IconButton (sempre com rótulo acessível) ---------- */

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  shortcut?: string;
  size?: 'md' | 'sm' | 'xs';
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  active?: boolean;
  noTooltip?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, size = 'md', tooltipSide, active, noTooltip, className = '', children, ...rest },
  ref,
) {
  const btn = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-active={active ? 'true' : undefined}
      className={`icon-btn ${size === 'sm' ? 'icon-btn-sm' : size === 'xs' ? 'icon-btn-xs' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
  if (noTooltip) return btn;
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      {btn}
    </Tooltip>
  );
});

/* ---------- Modal ---------- */

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'wide' | 'narrow';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${size ?? ''}`} aria-describedby={description ? undefined : undefined}>
          <div className="dialog-header">
            <div>
              <Dialog.Title className="dialog-title">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="dialog-desc">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : 'Diálogo'}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Fechar" size="sm" className="dialog-close" noTooltip>
                <X size={16} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- Confirmação global ---------- */

export function ConfirmHost() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  useEffect(() => {
    registerConfirmHandler(
      (o) =>
        new Promise<boolean>((resolve) => {
          setState({ ...o, resolve });
        }),
    );
  }, []);

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  return (
    <AlertDialog.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content narrow">
          <div className="dialog-header">
            <div>
              <AlertDialog.Title className="dialog-title">{state?.title}</AlertDialog.Title>
              <AlertDialog.Description className="dialog-desc">{state?.message}</AlertDialog.Description>
            </div>
          </div>
          <div className="dialog-footer">
            <AlertDialog.Cancel asChild>
              <button type="button" className="btn">
                {state?.cancelLabel ?? 'Cancelar'}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button type="button" className={`btn ${state?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {state?.confirmLabel ?? 'Confirmar'}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ---------- Estado vazio compacto ---------- */

export function EmptyHint({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty-hint">
      {icon && <div className="empty-hint-icon">{icon}</div>}
      <div className="empty-hint-title">{title}</div>
      {children && <div className="empty-hint-body">{children}</div>}
    </div>
  );
}

