import React from 'react';
import GlassToggle from '@/components/ui/glass/toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/glass/tooltip';

interface SessionStatusProps {
  timeRemaining: number | null;
  autoReconnect: boolean;
  onAutoReconnectChange: (value: boolean) => void;
  formatTime: (seconds: number | null) => string;
}

export function SessionStatus({
  timeRemaining,
  autoReconnect,
  onAutoReconnectChange,
  formatTime,
}: SessionStatusProps) {
  return (
    <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 glass-panel-inset px-2.5 py-1.5 rounded-lg">
          <div
            className={`w-1.5 h-1.5 rounded-full ${timeRemaining !== null && timeRemaining < 60 ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor:
                timeRemaining === null
                  ? 'var(--status-inactive-bg)'
                  : timeRemaining < 60
                    ? 'var(--status-danger-bg)'
                    : timeRemaining < 180
                      ? 'var(--status-warning-bg)'
                      : 'var(--status-success-bg)',
            }}
          />
          <span
            className="text-xs font-mono font-semibold min-w-[2.75rem] text-center"
            style={{
              color:
                timeRemaining === null
                  ? 'var(--status-inactive-text)'
                  : timeRemaining < 60
                    ? 'var(--status-danger-text)'
                    : timeRemaining < 180
                      ? 'var(--status-warning-text)'
                      : 'var(--status-success-text)',
            }}
            title={
              timeRemaining !== null
                ? 'Time remaining in current session (10 min limit)'
                : 'Session not active'
            }
          >
            {formatTime(timeRemaining)}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Auto
              </span>
              <GlassToggle
                checked={autoReconnect}
                onChange={onAutoReconnectChange}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Automatically reconnect when session expires (10-minute limit)
          </TooltipContent>
        </Tooltip>
      </div>
  );
}
