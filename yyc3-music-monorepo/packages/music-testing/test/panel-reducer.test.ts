// §2.1 — Panel Reducer Logic（自研套件 Vitest 化）
import { describe, it, expect } from 'vitest'

type PanelType = string | null;
type PanelAction =
  | { type: 'OPEN'; panel: string }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE'; panel: string };

function panelReducer(state: PanelType, action: PanelAction): PanelType {
  switch (action.type) {
    case 'OPEN': return action.panel;
    case 'CLOSE': return null;
    case 'TOGGLE': return state === action.panel ? null : action.panel;
    default: return state;
  }
}

describe('§2.1 Panel Reducer', () => {
  it('初始状态为 null', () => {
    expect(panelReducer(null, { type: 'CLOSE' })).toBeNull();
  });

  it('OPEN 设置面板', () => {
    expect(panelReducer(null, { type: 'OPEN', panel: 'analytics' })).toBe('analytics');
  });

  it('CLOSE 清除面板', () => {
    expect(panelReducer('analytics', { type: 'CLOSE' })).toBeNull();
  });

  it('TOGGLE 打开', () => {
    expect(panelReducer(null, { type: 'TOGGLE', panel: 'community' })).toBe('community');
  });

  it('TOGGLE 关闭（相同面板）', () => {
    expect(panelReducer('community', { type: 'TOGGLE', panel: 'community' })).toBeNull();
  });

  it('TOGGLE 切换（不同面板）→ 互斥', () => {
    expect(panelReducer('analytics', { type: 'TOGGLE', panel: 'community' })).toBe('community');
  });

  it('OPEN 覆盖旧面板 → 互斥', () => {
    expect(panelReducer('analytics', { type: 'OPEN', panel: 'starpower' })).toBe('starpower');
  });
});
