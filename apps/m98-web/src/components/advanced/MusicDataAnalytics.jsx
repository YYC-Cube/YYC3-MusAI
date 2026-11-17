import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

const AnalyticsContainer = styled.div`
  background: var(--gradient-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin: var(--spacing-xl) 0;
  backdrop-filter: blur(10px);
  border: var(--border-primary);
`;

const SectionTitle = styled.h2`
  color: var(--text-primary);
  font-size: var(--text-3xl);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
  text-align: center;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
`;

const StatCard = styled(motion.div)`
  background: rgba(22, 27, 34, 0.8);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(139, 148, 158, 0.2);
  text-align: center;
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-3px);
    box-shadow: var(--shadow-card);
  }
`;

const StatIcon = styled.div`
  font-size: var(--text-3xl);
  margin-bottom: var(--spacing-sm);
`;

const StatValue = styled.div`
  color: var(--primary-purple);
  font-size: var(--text-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
`;

const StatTrend = styled.div`
  color: ${props => props.positive ? '#22c55e' : '#ef4444'};
  font-size: var(--text-xs);
  margin-top: var(--spacing-xs);
  
  &::before {
    content: '${props => props.positive ? '↗' : '↘'}';
    margin-right: 4px;
  }
`;

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled.div`
  background: rgba(22, 27, 34, 0.6);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(139, 148, 158, 0.2);
`;

const ChartTitle = styled.h3`
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
`;

const LineChart = styled.div`
  height: 200px;
  position: relative;
  overflow: hidden;
`;

const ChartAxis = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(139, 148, 158, 0.3);
`;

const ChartLine = styled(motion.svg)`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

const DataPoint = styled(motion.circle)`
  fill: var(--primary-purple);
  stroke: white;
  stroke-width: 2;
  cursor: pointer;
  
  &:hover {
    fill: var(--primary-coral);
    r: 6;
  }
`;

const PieChart = styled.div`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const PieSegment = styled(motion.path)`
  fill: ${props => props.color};
  stroke: rgba(13, 17, 23, 0.8);
  stroke-width: 2;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

const PieLegend = styled.div`
  margin-top: var(--spacing-md);
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
`;

const LegendColor = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const RealtimeSection = styled.div`
  background: rgba(22, 27, 34, 0.6);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(138, 43, 226, 0.3);
`;

const RealtimeTitle = styled.h3`
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
`;

const LiveIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const RealtimeMetrics = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid rgba(139, 148, 158, 0.1);
`;

const MetricLabel = styled.span`
  color: var(--text-secondary);
  font-size: var(--text-sm);
`;

const MetricValue = styled.span`
  color: var(--text-primary);
  font-weight: 600;
`;

const MusicDataAnalytics = () => {
  const [stats, setStats] = useState({
    totalPlays: 2847569,
    monthlyListeners: 158423,
    followers: 45672,
    tracksReleased: 12,
    averageRating: 4.8,
    totalDuration: 2847
  });
  
  const [realtimeData, setRealtimeData] = useState({
    currentListeners: 1247,
    todayPlays: 5683,
    newFollowers: 42,
    activeCountries: 28
  });

  const [chartData, setChartData] = useState([]);
  const [genreData, setGenreData] = useState([]);

  useEffect(() => {
    // 生成播放量趋势数据
    const generateChartData = () => {
      const data = [];
      const baseValue = 10000;
      for (let i = 0; i < 30; i++) {
        data.push({
          day: i + 1,
          plays: baseValue + Math.random() * 5000 + i * 200,
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        });
      }
      setChartData(data);
    };

    // 生成音乐类型分布数据
    const generateGenreData = () => {
      setGenreData([
        { label: '电子融合', value: 35, color: '#8A2BE2' },
        { label: '古典现代', value: 28, color: '#FF6B6B' },
        { label: '环境音乐', value: 20, color: '#4ECDC4' },
        { label: '实验音乐', value: 17, color: '#45B7D1' }
      ]);
    };

    generateChartData();
    generateGenreData();

    // 实时数据更新
    const interval = setInterval(() => {
      setRealtimeData(prev => ({
        currentListeners: prev.currentListeners + Math.floor(Math.random() * 20 - 10),
        todayPlays: prev.todayPlays + Math.floor(Math.random() * 50),
        newFollowers: prev.newFollowers + Math.floor(Math.random() * 3),
        activeCountries: prev.activeCountries + Math.floor(Math.random() * 2 - 1)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const createPiePath = (startAngle, endAngle, radius = 80) => {
    const centerX = 100;
    const centerY = 100;
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const createLinePath = (data) => {
    const width = 300;
    const height = 150;
    const maxValue = Math.max(...data.map(d => d.plays));
    
    return data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (point.plays / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <AnalyticsContainer>
      <SectionTitle>音乐数据中心</SectionTitle>
      
      <StatsGrid>
        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon>🎵</StatIcon>
          <StatValue>{formatNumber(stats.totalPlays)}</StatValue>
          <StatLabel>总播放量</StatLabel>
          <StatTrend positive>+12.3% 本月</StatTrend>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon>👥</StatIcon>
          <StatValue>{formatNumber(stats.monthlyListeners)}</StatValue>
          <StatLabel>月度听众</StatLabel>
          <StatTrend positive>+8.7% 本月</StatTrend>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon>❤️</StatIcon>
          <StatValue>{formatNumber(stats.followers)}</StatValue>
          <StatLabel>粉丝数量</StatLabel>
          <StatTrend positive>+15.2% 本月</StatTrend>
        </StatCard>

        <StatCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon>⭐</StatIcon>
          <StatValue>{stats.averageRating}</StatValue>
          <StatLabel>平均评分</StatLabel>
          <StatTrend positive>+0.2 本月</StatTrend>
        </StatCard>
      </StatsGrid>

      <ChartsSection>
        <ChartContainer>
          <ChartTitle>30天播放量趋势</ChartTitle>
          <LineChart>
            <ChartAxis />
            <ChartLine viewBox="0 0 300 150">
              <motion.path
                d={createLinePath(chartData)}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8A2BE2" />
                  <stop offset="100%" stopColor="#FF6B6B" />
                </linearGradient>
              </defs>
              {chartData.map((point, index) => (
                <DataPoint
                  key={index}
                  cx={(index / (chartData.length - 1)) * 300}
                  cy={150 - (point.plays / Math.max(...chartData.map(d => d.plays))) * 150}
                  r="4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2 + index * 0.1 }}
                />
              ))}
            </ChartLine>
          </LineChart>
        </ChartContainer>

        <ChartContainer>
          <ChartTitle>音乐类型分布</ChartTitle>
          <PieChart>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {genreData.map((segment, index) => {
                const total = genreData.reduce((sum, item) => sum + item.value, 0);
                let currentAngle = 0;
                for (let i = 0; i < index; i++) {
                  currentAngle += (genreData[i].value / total) * 2 * Math.PI;
                }
                const startAngle = currentAngle;
                const endAngle = currentAngle + (segment.value / total) * 2 * Math.PI;

                return (
                  <PieSegment
                    key={index}
                    d={createPiePath(startAngle, endAngle)}
                    color={segment.color}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1 + index * 0.2 }}
                  />
                );
              })}
            </svg>
          </PieChart>
          <PieLegend>
            {genreData.map((item, index) => (
              <LegendItem key={index}>
                <LegendColor color={item.color} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.label} ({item.value}%)
                </span>
              </LegendItem>
            ))}
          </PieLegend>
        </ChartContainer>
      </ChartsSection>

      <RealtimeSection>
        <RealtimeTitle>
          <LiveIndicator />
          实时数据
        </RealtimeTitle>
        <RealtimeMetrics>
          <MetricRow>
            <MetricLabel>🎧 当前在线听众</MetricLabel>
            <MetricValue>{realtimeData.currentListeners.toLocaleString()}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>📊 今日播放量</MetricLabel>
            <MetricValue>{realtimeData.todayPlays.toLocaleString()}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>➕ 新增粉丝</MetricLabel>
            <MetricValue>+{realtimeData.newFollowers}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>🌍 活跃国家/地区</MetricLabel>
            <MetricValue>{realtimeData.activeCountries}</MetricValue>
          </MetricRow>
        </RealtimeMetrics>
      </RealtimeSection>
    </AnalyticsContainer>
  );
};

export default MusicDataAnalytics;
