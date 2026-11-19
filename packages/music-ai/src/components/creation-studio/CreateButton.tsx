// 创作工作室 · 表单块-创作按钮（待机/进行中/完成三态）
import React from 'react';
import { motion } from 'motion/react';
import { Loader2, Check } from 'lucide-react';
import type { ComposingStage } from './shared';

interface CreateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className: string;
  stage: ComposingStage;
  progressLabel: string;
  doneLabel: string;
  idleIcon: React.ReactNode;
  idleLabel: string;
}

export const CreateButton: React.FC<CreateButtonProps> = ({
  onClick,
  disabled,
  className,
  stage,
  progressLabel,
  doneLabel,
  idleIcon,
  idleLabel,
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {stage !== 'idle' && stage !== 'done' ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {progressLabel}
        </>
      ) : stage === 'done' ? (
        <>
          <Check className="w-5 h-5 text-green-300" />
          {doneLabel}
        </>
      ) : (
        <>
          {idleIcon}
          {idleLabel}
        </>
      )}
    </motion.button>
  );
};
