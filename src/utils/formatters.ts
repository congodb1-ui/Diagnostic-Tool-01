/**
 * Formatters and UI status helpers for Zaboraa Network Path Analyzer
 * Complies with WCAG AA contrast (min 4.5:1) and never relies on colour alone.
 */

import { SeverityLevel, CheckStatus } from '../engine/types';

export function getSeverityClasses(severity: SeverityLevel): {
  badge: string;
  border: string;
  text: string;
  bg: string;
} {
  switch (severity) {
    case 'BLOCKED':
      return {
        badge: 'bg-rose-950/80 text-rose-200 border border-rose-600/80',
        border: 'border-rose-600/60',
        text: 'text-rose-300',
        bg: 'bg-rose-950/30'
      };
    case 'WARNING':
      return {
        badge: 'bg-amber-950/80 text-amber-200 border border-amber-600/80',
        border: 'border-amber-600/60',
        text: 'text-amber-300',
        bg: 'bg-amber-950/30'
      };
    case 'OK':
      return {
        badge: 'bg-emerald-950/80 text-emerald-200 border border-emerald-600/80',
        border: 'border-emerald-600/60',
        text: 'text-emerald-300',
        bg: 'bg-emerald-950/30'
      };
  }
}

export function getCheckStatusClasses(status: CheckStatus): {
  badge: string;
  text: string;
  iconColor: string;
} {
  switch (status) {
    case 'OPEN':
      return {
        badge: 'bg-emerald-950/80 text-emerald-200 border border-emerald-600',
        text: 'text-emerald-300',
        iconColor: 'text-emerald-300'
      };
    case 'RESPONDER_CONFIRMED':
      return {
        badge: 'bg-emerald-950/80 text-emerald-200 border border-emerald-600',
        text: 'text-emerald-300',
        iconColor: 'text-emerald-300'
      };
    case 'CLOSED':
      return {
        badge: 'bg-rose-950/80 text-rose-200 border border-rose-600',
        text: 'text-rose-300',
        iconColor: 'text-rose-300'
      };
    case 'BLOCKED':
      return {
        badge: 'bg-rose-950/80 text-rose-200 border border-rose-600',
        text: 'text-rose-300',
        iconColor: 'text-rose-300'
      };
    case 'WARNING':
      return {
        badge: 'bg-amber-950/80 text-amber-200 border border-amber-600',
        text: 'text-amber-300',
        iconColor: 'text-amber-300'
      };
    case 'INCONCLUSIVE':
      return {
        badge: 'bg-indigo-950/80 text-indigo-200 border border-indigo-600',
        text: 'text-indigo-300',
        iconColor: 'text-indigo-300'
      };
    case 'CANNOT_BE_TESTED':
      return {
        badge: 'bg-slate-900 text-slate-300 border border-slate-700',
        text: 'text-slate-300',
        iconColor: 'text-slate-400'
      };
    case 'PROBING':
      return {
        badge: 'bg-cyan-950/80 text-cyan-200 border border-cyan-600 animate-pulse',
        text: 'text-cyan-300',
        iconColor: 'text-cyan-300'
      };
    default:
      return {
        badge: 'bg-slate-900 text-slate-300 border border-slate-700',
        text: 'text-slate-300',
        iconColor: 'text-slate-400'
      };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
