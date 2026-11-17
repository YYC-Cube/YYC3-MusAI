import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('页面渲染成功', () => {
  render(<App />);
  // 多处文案含「董小姐」，改为断言主标题（迁移改造：修复源项目多元素匹配缺陷）
  expect(screen.getAllByText(/董小姐/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});
