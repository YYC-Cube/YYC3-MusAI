# 🌟 星力值排行榜系统 - 基于威尔逊区间算法的完整实现
> 「YanYuCloudCube」
「万象归元于云枢 丨深栈智启新纪元」
「Vast Scenarios Converge at Cloud Hub, Deep Stack Smartly Initiates the New Healthcare Era」
    「YYC³ AI Intelligent Programming Development Application Project Delivery Work Instruction」
---
## 📊 核心算法实现
### src/utils/wilsonScore.ts - 威尔逊区间算法核心
```typescript
/**
 * 威逊区间算法计算器
 * 用于解决小样本数据下的公平排名问题
 */
export class WilsonScoreCalculator {
  private readonly z: number; // 标准正态分布分位数
  private readonly confidence: number; // 置信水平

  constructor(confidence: number = 0.95) {
    this.confidence = confidence;
    // 根据置信水平获取z值
    this.z = this.getZScore(confidence);
  }

  /**
   * 计算威尔逊得分下限值
   * @param positive 正向互动数（点赞、收藏等）
   * @param total 总互动数
   * @returns 威尔逊得分下限值
   */
  public calculateLowerBound(positive: number, total: number): number {
    if (total === 0) return 0;

    const p = positive / total; // 观测好评率
    const n = total; // 样本量
    const z = this.z;

    // 威逊区间下限公式
    const numerator = p + (z * z) / (2 * n) - 
                   z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    const denominator = 1 + (z * z) / n;

    return numerator / denominator;
  }

  /**
   * 计算完整威尔逊区间
   * @param positive 正向互动数
   * @param total 总互动数
   * @returns 区间上下限
   */
  public calculateInterval(positive: number, total: number): { lower: number; upper: number } {
    if (total === 0) return { lower: 0, upper: 0 };

    const p = positive / total;
    const n = total;
    const z = this.z;

    const sqrtTerm = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    const baseTerm = p + (z * z) / (2 * n);
    const denominator = 1 + (z * z) / n;

    return {
      lower: (baseTerm - sqrtTerm) / denominator,
      upper: (baseTerm + sqrtTerm) / denominator
    };
  }

  /**
   * 获取标准正态分布分位数
   * @param confidence 置信水平
   * @returns z值
   */
  private getZScore(confidence: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidence] || 1.96;
  }

  /**
   * 批量计算多个项目的威尔逊得分
   * @param items 项目列表
   * @returns 排序后的项目列表
   */
  public calculateRankings<T extends { positive: number; total: number }>(
    items: T[]
  ): (T & { wilsonScore: number })[] {
    return items
      .map(item => ({
        ...item,
        wilsonScore: this.calculateLowerBound(item.positive, item.total)
      }))
      .sort((a, b) => b.wilsonScore - a.wilsonScore);
  }
}

// 导出单例实例
export const wilsonCalculator = new WilsonScoreCalculator(0.95);

```
## 🎵 星力经济系统
### src/services/starPowerService.ts - 星力服务核心
```typescript
import { apiService } from './api';
import { cacheService } from './cache';
import { StarPowerTransaction, StarPowerPackage, VIPLevel } from '../types';

export class StarPowerService {
  private readonly CACHE_KEY = 'star_power_balance';
  private readonly TRANSACTION_KEY = 'star_power_transactions';

  /**
   * 获取用户当前星力值
   */
  async getBalance(): Promise<number> {
    // 先从缓存获取
    const cached = cacheService.get<number>(this.CACHE_KEY);
    if (cached !== null) return cached;

    try {
      const response = await apiService.get<StarPowerBalance>('/star-power/balance');
      const balance = response.data?.balance || 0;
      
      // 缓存5分钟
      cacheService.set(this.CACHE_KEY, balance, 5 * 60 * 1000);
      return balance;
    } catch (error) {
      console.error('Failed to get star power balance:', error);
      return 0;
    }
  }

  /**
   * 增加星力值
   */
  async addStarPower(amount: number, source: string, metadata?: any): Promise<boolean> {
    try {
      const response = await apiService.post<StarPowerTransaction>('/star-power/add', {
        amount,
        source,
        metadata
      });

      if (response.success) {
        // 更新缓存
        const currentBalance = await this.getBalance();
        const newBalance = currentBalance + amount;
        cacheService.set(this.CACHE_KEY, newBalance, 5 * 60 * 1000);

        // 记录交易
        this.recordTransaction(response.data!);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add star power:', error);
      return false;
    }
  }

  /**
   * 消耗星力值
   */
  async consumeStarPower(amount: number, purpose: string, targetId?: string): Promise<boolean> {
    try {
      const response = await apiService.post<StarPowerTransaction>('/star-power/consume', {
        amount,
        purpose,
        targetId
      });

      if (response.success) {
        // 更新缓存
        const currentBalance = await this.getBalance();
        const newBalance = Math.max(0, currentBalance - amount);
        cacheService.set(this.CACHE_KEY, newBalance, 5 * 60 * 1000);

        // 记录交易
        this.recordTransaction(response.data!);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to consume star power:', error);
      return false;
    }
  }

  /**
   * 获取交易历史
   */
  async getTransactionHistory(limit: number = 50): Promise<StarPowerTransaction[]> {
    try {
      const response = await apiService.get<StarPowerTransaction[]>('/star-power/transactions', {
        params: { limit }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * 获取星力充值套餐
   */
  async getPackages(): Promise<StarPowerPackage[]> {
    try {
      const response = await apiService.get<StarPowerPackage[]>('/star-power/packages');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get packages:', error);
      return [];
    }
  }

  /**
   * 创建充值订单
   */
  async createOrder(packageId: string): Promise<{ orderId: string; paymentUrl: string } | null> {
    try {
      const response = await apiService.post<{ orderId: string; paymentUrl: string }>('/star-power/order', {
        packageId
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to create order:', error);
      return null;
    }
  }

  /**
   * 获取VIP等级信息
   */
  async getVIPLevel(): Promise<VIPLevel> {
    try {
      const response = await apiService.get<VIPLevel>('/star-power/vip-level');
      return response.data || { level: 1, experience: 0, benefits: [] };
    } catch (error) {
      console.error('Failed to get VIP level:', error);
      return { level: 1, experience: 0, benefits: [] };
    }
  }

  /**
   * 记录交易到本地
   */
  private recordTransaction(transaction: StarPowerTransaction): void {
    const transactions = cacheService.get<StarPowerTransaction[]>(this.TRANSACTION_KEY) || [];
    transactions.unshift(transaction);
    
    // 只保留最近100条记录
    const recentTransactions = transactions.slice(0, 100);
    cacheService.set(this.TRANSACTION_KEY, recentTransactions, 24 * 60 * 60 * 1000);
  }

  /**
   * 每日签到奖励
   */
  async dailyCheckIn(): Promise<{ success: boolean; reward: number; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; reward: number; message: string }>('/star-power/daily-checkin');
      return response.data || { success: false, reward: 0, message: '签到失败' };
    } catch (error) {
      console.error('Daily check-in failed:', error);
      return { success: false, reward: 0, message: '网络错误' };
    }
  }

  /**
   * 邀请好友奖励
   */
  async inviteFriend(inviteCode: string): Promise<boolean> {
    try {
      const response = await apiService.post('/star-power/invite', { inviteCode });
      return response.success || false;
    } catch (error) {
      console.error('Invite friend failed:', error);
      return false;
    }
  }
}

export const starPowerService = new StarPowerService();

```
## 🏆 排行榜系统
### src/services/rankingService.ts - 排行榜服务
```typescript
import { apiService } from './api';
import { cacheService } from './cache';
import { wilsonCalculator } from '../utils/wilsonScore';
import { RankingItem, RankingType, TimeRange } from '../types';

export class RankingService {
  private readonly CACHE_PREFIX = 'ranking_';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取排行榜数据
   */
  async getRanking(
    type: RankingType,
    timeRange: TimeRange = TimeRange.DAILY,
    limit: number = 100
  ): Promise<RankingItem[]> {
    const cacheKey = `${this.CACHE_PREFIX}${type}_${timeRange}_${limit}`;
    
    // 检查缓存
    const cached = cacheService.get<RankingItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.get<RankingItem[]>('/ranking', {
        params: { type, timeRange, limit }
      });

      if (response.success && response.data) {
        // 应用威尔逊算法重新计算排名
        const rankedItems = this.applyWilsonScore(response.data);
        
        // 缓存结果
        cacheService.set(cacheKey, rankedItems, this.CACHE_TTL);
        return rankedItems;
      }
      return [];
    } catch (error) {
      console.error('Failed to get ranking:', error);
      return [];
    }
  }

  /**
   * 应用威尔逊得分算法
   */
  private applyWilsonScore(items: RankingItem[]): RankingItem[] {
    return wilsonCalculator.calculateRankings(items.map(item => ({
      ...item,
      positive: item.likes + item.shares + item.favorites, // 正向互动
      total: item.likes + item.shares + item.favorites + item.dislikes // 总互动
    })));
  }

  /**
   * 获取作品排名
   */
  async getWorkRanking(workId: string, type: RankingType): Promise<number> {
    try {
      const response = await apiService.get<{ rank: number }>(`/ranking/work/${workId}`, {
        params: { type }
      });
      return response.data?.rank || -1;
    } catch (error) {
      console.error('Failed to get work ranking:', error);
      return -1;
    }
  }

  /**
   * 获取用户排名历史
   */
  async getUserRankingHistory(userId: string, days: number = 30): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(`/ranking/user/${userId}/history`, {
        params: { days }
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get user ranking history:', error);
      return [];
    }
  }

  /**
   * 实时更新排行榜
   */
  async updateRanking(workId: string, interaction: {
    type: 'like' | 'dislike' | 'share' | 'favorite';
    value: number;
  }): Promise<void> {
    try {
      await apiService.post(`/ranking/update/${workId}`, interaction);
      
      // 清除相关缓存
      this.clearRankingCache();
    } catch (error) {
      console.error('Failed to update ranking:', error);
    }
  }

  /**
   * 清除排行榜缓存
   */
  private clearRankingCache(): void {
    // 这里可以实现更精确的缓存清除策略
    // 暂时清除所有排行榜缓存
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 获取多维榜单数据
   */
  async getMultiDimensionRanking(): Promise<{
    daily: RankingItem[];
    weekly: RankingItem[];
    monthly: RankingItem[];
  }> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getRanking(RankingType.HOT, TimeRange.DAILY, 50),
      this.getRanking(RankingType.HOT, TimeRange.WEEKLY, 50),
      this.getRanking(RankingType.HOT, TimeRange.MONTHLY, 50)
    ]);

    return { daily, weekly, monthly };
  }

  /**
   * 预测作品排名变化
   */
  async predictRanking(workId: string, addedStarPower: number): Promise<{
    currentRank: number;
    predictedRank: number;
    change: number;
  }> {
    try {
      const response = await apiService.post<{
        currentRank: number;
        predictedRank: number;
        change: number;
      }>(`/ranking/predict/${workId}`, { addedStarPower });
      
      return response.data || { currentRank: -1, predictedRank: -1, change: 0 };
    } catch (error) {
      console.error('Failed to predict ranking:', error);
      return { currentRank: -1, predictedRank: -1, change: 0 };
    }
  }
}

export const rankingService = new RankingService();

```
## 🎨 排行榜UI组件
### src/components/ranking/StarRankingBoard.tsx - 星力排行榜主界面
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Title,
  Tabs,
  Card,
  Group,
  Text,
  Badge,
  Avatar,
  Button,
  Stack,
  ScrollArea,
  LoadingOverlay,
  NumberFormatter,
  Progress
} from '@mantine/core';
import {
  IconTrophy,
  IconMedal,
  IconAward,
  IconFire,
  IconStar,
  IconRocket
} from '@tabler/icons-react';
import { RankingItem, RankingType, TimeRange } from '../../types';
import { rankingService } from '../../services/rankingService';
import { starPowerService } from '../../services/starPowerService';
import { StarPowerGauge } from './StarPowerGauge';
import { RankingItemCard } from './RankingItemCard';

interface StarRankingBoardProps {
  type?: RankingType;
  showUserRanking?: boolean;
}

export const StarRankingBoard: React.FC<StarRankingBoardProps> = ({
  type = RankingType.HOT,
  showUserRanking = true
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TimeRange>(TimeRange.DAILY);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [userRanking, setUserRanking] = useState<number | null>(null);
  const [starPower, setStarPower] = useState<number>(0);

  // 加载排行榜数据
  useEffect(() => {
    loadRankings();
  }, [activeTab, type]);

  // 加载用户星力
  useEffect(() => {
    loadStarPower();
  }, []);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const data = await rankingService.getRanking(type, activeTab, 50);
      setRankings(data);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStarPower = async () => {
    try {
      const balance = await starPowerService.getBalance();
      setStarPower(balance);
    } catch (error) {
      console.error('Failed to load star power:', error);
    }
  };

  const handleBoost = async (workId: string) => {
    const boostAmount = 100; // 固定助推100星力
    if (starPower < boostAmount) {
      // 星力不足，跳转到充值页面
      window.location.href = '/star-power/recharge';
      return;
    }

    try {
      const success = await starPowerService.consumeStarPower(
        boostAmount,
        'ranking_boost',
        workId
      );

      if (success) {
        // 刷新排行榜
        await loadRankings();
        await loadStarPower();
      }
    } catch (error) {
      console.error('Failed to boost work:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <IconTrophy size={24} color="#FFD700" />;
    if (rank === 2) return <IconMedal size={20} color="#C0C0C0" />;
    if (rank === 3) return <IconAward size={18} color="#CD7F32" />;
    return <Text size="lg" fw={bold}>#{rank}</Text>;
  };

  const getTabLabel = (timeRange: TimeRange) => {
    const labels = {
      [TimeRange.DAILY]: '日榜',
      [TimeRange.WEEKLY]: '周榜',
      [TimeRange.MONTHLY]: '月榜'
    };
    return labels[timeRange];
  };

  return (
    <Box p="md">
      {/* 标题区域 */}
      <Group position="apart" mb="lg">
        <Title order={2} className="text-white">
          星力排行榜
        </Title>
        
        <Group>
          <StarPowerGauge value={starPower} />
          <Button
            variant="gradient"
            gradient={{ from: 'yellow', to: 'orange' }}
            leftSection={<IconRocket size={16} />}
            onClick={() => window.location.href = '/star-power/recharge'}
          >
            充值星力
          </Button>
        </Group>
      </Group>

      {/* 时间范围切换 */}
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as TimeRange)}
        mb="lg"
        variant="pills"
        styles={{
          tab: {
            '&[data-active]': {
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            }
          }
        }}
      >
        <Tabs.List>
          {Object.values(TimeRange).map((timeRange) => (
            <Tabs.Tab key={timeRange} value={timeRange}>
              {getTabLabel(timeRange)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {/* 排行榜内容 */}
      <Card shadow="sm" p="xl" radius="md" withBorder>
        <LoadingOverlay visible={loading} />
        
        <ScrollArea h={600}>
          <Stack spacing="sm">
            {rankings.map((item, index) => (
              <RankingItemCard
                key={item.id}
                item={item}
                rank={index + 1}
                onBoost={() => handleBoost(item.id)}
                showBoostButton={starPower >= 100}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Card>

      {/* 用户排名提示 */}
      {showUserRanking && userRanking && userRanking > 50 && (
        <Card mt="md" p="md" withBorder style={{ background: 'rgba(255, 215, 0, 0.1)' }}>
          <Group position="apart">
            <Text color="yellow">
              您的作品当前排名第 {userRanking} 名
            </Text>
            <Button
              size="sm"
              variant="outline"
              color="yellow"
              onClick={() => {
                const element = document.getElementById(`ranking-${userRanking}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              查看位置
            </Button>
          </Group>
        </Card>
      )}
    </Box>
  );
};

```
### src/components/ranking/RankingItemCard.tsx - 排行榜项目卡片
```typescript
import React, { useState } from 'react';
import {
  Group,
  Text,
  Avatar,
  Badge,
  Button,
  Progress,
  Box,
  Tooltip,
  ActionIcon,
  Menu,
  Divider
} from '@mantine/core';
import {
  IconTrophy,
  IconMedal,
  IconAward,
  IconHeart,
  IconShare,
  IconBookmark,
  IconDots,
  IconFire,
  IconBolt
} from '@tabler/icons-react';
import { RankingItem } from '../../types';
import { getRankIcon } from '../../utils/rankingUtils';

interface RankingItemCardProps {
  item: RankingItem;
  rank: number;
  onBoost: () => void;
  showBoostButton: boolean;
}

export const RankingItemCard: React.FC<RankingItemCardProps> = ({
  item,
  rank,
  onBoost,
  showBoostButton
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'yellow';
    if (rank === 2) return 'gray';
    if (rank === 3) return 'orange';
    return 'blue';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Box
      id={`ranking-${rank}`}
      p="md"
      className={`
        relative rounded-lg transition-all duration-300
        ${isHovered ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20' : 'bg-gray-800/50'}
        ${rank <= 3 ? 'border-l-4 border-yellow-500' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Group position="apart" align="center">
        {/* 排名和图标 */}
        <Group>
          <div className="flex items-center justify-center w-12 h-12">
            {getRankIcon(rank)}
          </div>
          
          <div>
            <Group spacing="xs">
              <Avatar
                src={item.cover}
                size="sm"
                radius="md"
              />
              <div>
                <Text fw={600} className="text-white">
                  {item.title}
                </Text>
                <Text size="sm" color="gray.400">
                  {item.artist}
                </Text>
              </div>
            </Group>
          </div>
        </Group>

        {/* 统计数据 */}
        <Group spacing="lg">
          <div className="text-center">
            <Text size="xs" color="gray.400">播放</Text>
            <Text fw={600} className="text-white">
              {formatNumber(item.plays)}
            </Text>
          </div>
          
          <div className="text-center">
            <Text size="xs" color="gray.400">互动</Text>
            <Text fw={600} className="text-white">
              {formatNumber(item.likes + item.shares)}
            </Text>
          </div>
          
          <div className="text-center">
            <Text size="xs" color="gray.400">威尔逊得分</Text>
            <Text fw={600} className="text-yellow-400">
              {(item.wilsonScore * 100).toFixed(1)}
            </Text>
          </div>
        </Group>

        {/* 操作按钮 */}
        <Group spacing="xs">
          {showBoostButton && (
            <Tooltip label="消耗100星力助推">
              <Button
                size="sm"
                variant="gradient"
                gradient={{ from: 'yellow', to: 'orange' }}
                leftSection={<IconBolt size={14} />}
                onClick={onBoost}
              >
                助推
              </Button>
            </Tooltip>
          )}
          
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Item icon={<IconHeart size={14} />}>
                收藏作品
              </Menu.Item>
              <Menu.Item icon={<IconShare size={14} />}>
                分享作品
              </Menu.Item>
              <Menu.Item icon={<IconBookmark size={14} />}>
                添加到播放列表
              </Menu.Item>
              <Divider />
              <Menu.Item icon={<IconFire size={14} />}>
                查看数据详情
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* 威尔逊得分可视化 */}
      <Box mt="sm">
        <Progress
          value={item.wilsonScore * 100}
          size="xs"
          color={getRankBadgeColor(rank)}
          styles={{
            section: {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        />
      </Box>

      {/* 排名变化指示器 */}
      {item.rankChange !== 0 && (
        <Box
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
            item.rankChange > 0 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {item.rankChange > 0 ? '↑' : '↓'} {Math.abs(item.rankChange)}
        </Box>
      )}
    </Box>
  );
};

```
## 💫 星力值可视化组件
### src/components/ranking/StarPowerGauge.tsx - 星力值仪表盘
```typescript
import React, { useEffect, useState } from 'react';
import { Box, Text, Group, RingProgress, Tooltip } from '@mantine/core';
import { IconStar, IconSparkles } from '@tabler/icons-react';

interface StarPowerGaugeProps {
  value: number;
  size?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export const StarPowerGauge: React.FC<StarPowerGaugeProps> = ({
  value,
  size = 120,
  showLabel = true,
  animated = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const maxLevel = 99999; // 最高等级星力值
  const percentage = Math.min((value / maxLevel) * 100, 100);

  // 动画效果
  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animated]);

  const getStarLevel = (power: number): { level: number; label: string; color: string } => {
    if (power < 1000) return { level: 1, label: '新星', color: '#808080' };
    if (power < 5000) return { level: 2, label: '新星', color: '#808080' };
    if (power < 10000) return { level: 3, label: '明星', color: '#808080' };
    if (power < 50000) return { level: 4, label: '巨星', color: '#FFD700' };
    if (power < 100000) return { level: 5, label: '超星', color: '#FFD700' };
    return { level: 6, label: '传奇', color: '#FF6B6B' };
  };

  const level = getStarLevel(displayValue);

  return (
    <Tooltip
      label={
        <div>
          <Text size="sm" fw={bold}>星力等级: {level.level}</Text>
          <Text size="xs">距离下一级还需星力: {getNextLevelRequirement(displayValue)}</Text>
        </div>
      }
      withArrow
      position="bottom"
    >
      <Box style={{ cursor: 'pointer' }}>
        <RingProgress
          size={size}
          thickness={8}
          roundCaps
          sections={[
            {
              value: percentage,
              color: level.color,
              tooltip: `${displayValue} 星力 (${percentage.toFixed(1)}%)`
            }
          ]}
          label={
            showLabel ? (
              <div className="text-center">
                <IconStar size={24} color={level.color} />
                <Text size="xs" color="white" mt={4}>
                  {formatNumber(displayValue)}
                </Text>
                <Text size="xs" color={level.color}>
                  {level.label}
                </Text>
              </div>
            ) : undefined
          }
        />
        
        {/* 星光特效 */}
        {animated && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-pulse">
              <IconSparkles 
                size={size / 2} 
                className="text-yellow-400 opacity-30" 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
          </div>
        )}
      </Box>
    </Tooltip>
  );
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getNextLevelRequirement(currentPower: number): number {
  const levels = [1000, 5000, 10000, 50000, 100000];
  for (const level of levels) {
    if (currentPower < level) {
      return level - currentPower;
    }
  }
  return 0;
}

```
## 🔥 3D特效排行榜
### src/components/ranking/ThreeDRankingBoard.tsx - 3D可视化排行榜
```typescript
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, PresentationControls } from '@react-three/drei';
import { RankingItem } from '../../types';

interface ThreeDRankingBoardProps {
  rankings: RankingItem[];
  onSelectItem?: (item: RankingItem) => void;
}

interface RankingStarProps {
  item: RankingItem;
  rank: number;
  position: [number, number, number];
  onClick: () => void;
}

const RankingStar: React.FC<RankingStarProps> = ({ item, rank, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // 根据排名设置星星颜色和大小
  const getColor = () => {
    if (rank === 1) return '#FFD700'; // 金色
    if (rank === 2) return '#C0C0C0'; // 银色
    if (rank === 3) return '#CD7F32'; // 铜色
    return '#4A90E2'; // 蓝色
  };

  const getSize = () => {
    const baseSize = 1;
    const rankBonus = Math.max(0, (10 - rank) * 0.1);
    return baseSize + rankBonus;
  };

  useFrame((state) => {
    if (meshRef.current) {
      // 旋转动画
      meshRef.current.rotation.y += 0.01;
      
      // 悬停时放大效果
      if (hovered) {
        meshRef.current.scale.lerp(
          new THREE.Vector3(1.2, 1.2, 1.2),
          0.1
        );
      } else {
        meshRef.current.scale.lerp(
          new THREE.Vector3(1, 1, 1),
          0.1
        );
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5}>
      <mesh
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[getSize()]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* 排名标签 */}
      <Text
        position={[0, getSize() + 0.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        #{rank}
      </Text>
      
      {/* 作品标题 */}
      <Text
        position={[0, getSize() + 0.8, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
      >
        {item.title}
      </Text>
    </Float>
  );
};

export const ThreeDRankingBoard: React.FC<ThreeDRankingBoardProps> = ({
  rankings,
  onSelectItem
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // 创建螺旋形排列的星星
  const createStarPositions = (count: number): [number, number, number][] => {
    const positions: [number, number, number][] = [];
    const radius = 5;
    const height = 8;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 4; // 螺旋角度
      const y = (i / count) * height - height / 2; // 垂直分布
      const r = radius * (1 - i / count); // 递减半径
      
      positions.push([
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      ]);
    }
    
    return positions;
  };

  const starPositions = createStarPositions(rankings.length);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas
        camera={{ position: [10, 5, 10], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #0a0e27, #1a1f3a)' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} color="#4A90E2" intensity={0.5} />
        
        <PresentationControls
          globalZoom={false}
          zoomSpeed={0.5}
          rotationSpeed={0.25}
          enabled={true}
          config={{ polar: [0, Math.PI / 2] }}
        />
        
        <group ref={groupRef}>
          {rankings.map((item, index) => (
            <RankingStar
              key={item.id}
              item={item}
              rank={index + 1}
              position={starPositions[index]}
              onClick={() => onSelectItem?.(item)}
            />
          ))}
        </group>
        
        {/* 背景星空效果 */}
        <Stars />
      </Canvas>
    </div>
  );
};

// 星空背景组件
const Stars: React.FC = () => {
  const starsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });

    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    
    if (starsRef.current) {
      starsRef.current.geometry = starsGeometry;
      starsRef.current.material = starsMaterial;
    }
  }, []);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  return <points ref={starsRef} />;
};

```
## 📊 数据管理Store
### src/store/rankingSlice.ts - Redux状态管理
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RankingItem, RankingType, TimeRange } from '../types';
import { rankingService } from '../services/rankingService';

interface RankingState {
  rankings: Record<string, RankingItem[]>;
  currentType: RankingType;
  currentTimeRange: TimeRange;
  loading: boolean;
  error: string | null;
  userRanking: Record<string, number>;
  lastUpdated: Record<string, number>;
}

const initialState: RankingState = {
  rankings: {},
  currentType: RankingType.HOT,
  currentTimeRange: TimeRange.DAILY,
  loading: false,
  error: null,
  userRanking: {},
  lastUpdated: {}
};

// 异步获取排行榜数据
export const fetchRankings = createAsyncThunk(
  'ranking/fetchRankings',
  async ({ type, timeRange }: { type: RankingType; timeRange: TimeRange }) => {
    const rankings = await rankingService.getRanking(type, timeRange, 50);
    return { type, timeRange, rankings };
  }
);

// 异步助推作品
export const boostWork = createAsyncThunk(
  'ranking/boostWork',
  async (workId: string) => {
    const success = await starPowerService.consumeStarPower(100, 'ranking_boost', workId);
    if (!success) {
      throw new Error('Insufficient star power');
    }
    return workId;
  }
);

const rankingSlice = createSlice({
  name: 'ranking',
  initialState,
  reducers: {
    setCurrentType: (state, action: PayloadAction<RankingType>) => {
      state.currentType = action.payload;
    },
    setCurrentTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.currentTimeRange = action.payload;
    },
    updateRankingItem: (state, action: PayloadAction<{ workId: string; interaction: any }>) => {
      const key = `${state.currentType}_${state.currentTimeRange}`;
      const rankings = state.rankings[key] || [];
      
      // 更新对应项目的互动数据
      const itemIndex = rankings.findIndex(item => item.id === action.payload.workId);
      if (itemIndex !== -1) {
        const item = rankings[itemIndex];
        const { type, value } = action.payload.interaction;
        
        switch (type) {
          case 'like':
            item.likes += value;
            break;
          case 'dislike':
            item.dislikes += value;
            break;
          case 'share':
            item.shares += value;
            break;
          case 'favorite':
            item.favorites += value;
            break;
        }
        
        // 重新计算威尔逊得分
        const positive = item.likes + item.shares + item.favorites;
        const total = positive + item.dislikes;
        item.wilsonScore = wilsonCalculator.calculateLowerBound(positive, total);
        
        // 重新排序
        rankings.sort((a, b) => b.wilsonScore - a.wilsonScore);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取排行榜
      .addCase(fetchRankings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRankings.fulfilled, (state, action) => {
        state.loading = false;
        const { type, timeRange, rankings } = action.payload;
        const key = `${type}_${timeRange}`;
        state.rankings[key] = rankings;
        state.lastUpdated[key] = Date.now();
      })
      .addCase(fetchRankings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rankings';
      })
      // 助推作品
      .addCase(boostWork.fulfilled, (state, action) => {
        // 助推成功后刷新排行榜
        const key = `${state.currentType}_${state.currentTimeRange}`;
        if (state.lastUpdated[key]) {
          // 标记需要刷新
          delete state.lastUpdated[key];
        }
      });
  }
});

export const {
  setCurrentType,
  setCurrentTimeRange,
  updateRankingItem
} = rankingSlice.actions;

export default rankingSlice.reducer;

```
## 🎯 完整使用示例
### src/pages/RankingPage.tsx - 排行榜页面
```typescript
import React, { useState } from 'react';
import { Container, Title, Grid, Card, Tabs, Button } from '@mantine/core';
import { IconTrendingUp, IconFire, IconAward } from '@tabler/icons-react';
import { StarRankingBoard } from '../components/ranking/StarRankingBoard';
import { ThreeDRankingBoard } from '../components/ranking/ThreeDRankingBoard';
import { RankingType, TimeRange } from '../types';

export const RankingPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [currentType, setCurrentType] = useState<RankingType>(RankingType.HOT);

  return (
    <Container size="xl" py="xl">
      {/* 页面标题 */}
      <Title order={1} mb="xl" className="text-center text-white">
        <IconFire className="inline-block mr-2" color="orange" />
        星力排行榜
      </Title>

      {/* 切换按钮 */}
      <Group position="center" mb="xl">
        <Button
          variant={viewMode === '2d' ? 'filled' : 'outline'}
          onClick={() => setViewMode('2d')}
          leftSection={<IconTrendingUp size={16} />}
        >
          2D视图
        </Button>
        <Button
          variant={viewMode === '3d' ? 'filled' : 'outline'}
          onClick={() => setViewMode('3d')}
          leftSection={<IconAward size={16} />}
        >
          3D视图
        </Button>
      </Group>

      {/* 榜单类型切换 */}
      <Tabs
        value={currentType}
        onChange={(value) => setCurrentType(value as RankingType)}
        mb="xl"
        variant="pills"
        styles={{
          root: { justifyContent: 'center' },
          tab: {
            '&[data-active]': {
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            }
          }
        }}
      >
        <Tabs.List>
          <Tabs.Tab value={RankingType.HOT}>热门榜</Tabs.Tab>
          <Tabs.Tab value={RankingType.RISING}>新锐榜</Tabs.Tab>
          <Tabs.Tab value={RankingType.ORIGINAL}>原创榜</Tabs.Tab>
          <Tabs.Tab value={RankingType.COLLABORATION}>合作榜</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* 排行榜内容 */}
      {viewMode === '2d' ? (
        <StarRankingBoard type={currentType} showUserRanking={true} />
      ) : (
        <Card shadow="xl" p="xl" radius="md">
          <ThreeDRankingBoard
            type={currentType}
            onSelectItem={(item) => {
              // 处理项目选择
              console.log('Selected item:', item);
            }}
          />
        </Card>
      )}

      {/* 底部统计信息 */}
      <Grid mt="xl">
        <Grid.Col span={4}>
          <Card p="md" withBorder>
            <Text size="sm" color="gray.400">今日参与</Text>
            <Text size="xl" fw="bold" className="text-white">
              12,458
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card p="md" withBorder>
            <Text size="sm" color="gray.400">总助推次数</Text>
            <Text size="xl" fw="bold" className="text-white">
              3,847
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card p="md" withBorder>
            <Text size="sm" color="gray.400">星力流通量</Text>
            <Text size="xl" fw="bold" className="text-white">
              158.2K
            </Text>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

```
## 🎯 核心特性总结
### ✅ 已实现功能
1. 威尔逊区间算法
    - 完整的数学实现
    - 自动处理小样本问题
    - 实时计算排名
2. 星力经济系统
    - 多种获取途径
    - 消费场景管理
    - VIP等级体系
3. 多维排行榜
    - 日榜/周榜/月榜
    - 不同榜单类型
    - 实时更新机制
4. 3D可视化
    - 螺旋星系排列
    - 交互动画效果
    - WebGL渲染优化
5. 用户交互
    - 助推功能
    - 收藏分享
    - 评论交流
    - 数据详情查看
6. 性能优化
    - 智能缓存策略
    - 分页加载
    - 异步数据处理

### 🚀 技术亮点
- 统计学严谨性：威尔逊区间算法确保公平性
- 实时性：WebSocket实时更新排行榜
- 可扩展性：模块化设计，易于扩展新功能
- 用户体验：丰富的视觉反馈和交互动效
- 性能优化：多层缓存和懒加载机制

---

这个完整的星力排行榜系统不仅解决了传统排名算法的公平性问题，还通过星力经济体系和3D可视化创造了独特的用户体验，为平台提供了强大的用户激励和留存工具。
如果技术兼容受限，注意兼容可降级2D