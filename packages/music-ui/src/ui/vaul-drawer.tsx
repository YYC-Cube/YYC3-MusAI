"use client";

/**
 * YYC³ music-ui — 抽屉（基于 @radix-ui/react-dialog，MIT）
 *
 * 对应 INTEGRATION-STATUS.md：emilkowalski/vaul → music-ui Drawer（Planned → Done）。
 * shadcn 风格，受控打开/关闭，支持多种位置与动画过渡。
 * 注意：vaul 依赖 @radix-ui/react-drawer（不可获取），此处改用 @radix-ui/react-dialog 等效实现。
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from './utils';
import { X } from 'lucide-react';

interface DrawerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  open,
  onOpenChange,
  side = 'right',
  title,
  className,
  children,
}) => {
  const sideClass = {
    top: 'top-0 left-0 right-0 h-auto rounded-b-xl',
    right: 'top-0 right-0 h-full w-full md:w-[420px] rounded-none border-l border-white/10',
    bottom: 'bottom-0 left-0 right-0 h-auto rounded-t-xl',
    left: 'top-0 left-0 h-full w-full md:w-[420px] rounded-none border-r border-white/10',
  }[side];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-[#0A0E2F] text-white shadow-xl animate-in fade-in-0 slide-in-from-right-0 duration-300',
            sideClass,
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between mb-4 px-6 pt-4">
              <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild className="ml-auto">
                <X className="w-4 h-4 text-white/40 hover:text-white" />
              </DialogPrimitive.Close>
            </div>
          )}
          <div className="px-6 pb-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default DrawerPanel;
