import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { resolvePoster } from '../../config/assets';

const ConcertContainer = styled.div`
  background: var(--gradient-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin: var(--spacing-xl) 0;
  backdrop-filter: blur(10px);
  border: var(--border-primary);
  position: relative;
  overflow: hidden;
`;

const BackgroundEffect = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 30%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 107, 107, 0.1) 0%, transparent 50%);
  z-index: 0;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
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

const ConcertGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-xl);
`;

const ConcertCard = styled(motion.div)`
  background: rgba(22, 27, 34, 0.9);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(139, 148, 158, 0.2);
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-5px);
    box-shadow: var(--shadow-card);
  }
  
  &.featured {
    border: 2px solid var(--primary-purple);
    box-shadow: var(--shadow-primary);
  }
`;

const ConcertImage = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1));
  }
  
  .live-indicator {
    position: absolute;
    top: 15px;
    left: 15px;
    background: #ff4444;
    color: white;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .vr-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: var(--gradient-primary);
    color: white;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const ConcertInfo = styled.div`
  padding: var(--spacing-lg);
`;

const ConcertTitle = styled.h3`
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
`;

const ConcertSubtitle = styled.p`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0 0 var(--spacing-md) 0;
`;

const ConcertMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  
  .icon {
    width: 20px;
    text-align: center;
  }
`;

const CountdownContainer = styled.div`
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid var(--primary-purple);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  text-align: center;
`;

const CountdownTitle = styled.div`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-xs);
`;

const CountdownTime = styled.div`
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
`;

const TimeUnit = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .number {
    color: var(--primary-purple);
    font-size: var(--text-2xl);
    font-weight: 700;
    line-height: 1;
  }
  
  .label {
    color: var(--text-muted);
    font-size: var(--text-xs);
    margin-top: 2px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--spacing-sm);
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  background: ${props => props.primary ? 'var(--gradient-primary)' : 'rgba(22, 27, 34, 0.8)'};
  color: ${props => props.primary ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.primary ? 'transparent' : 'rgba(139, 148, 158, 0.3)'};
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
  
  &:hover {
    transform: translateY(-1px);
    background: ${props => props.primary ? 'var(--gradient-primary)' : 'rgba(138, 43, 226, 0.1)'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const VirtualConcertHub = () => {
  const [concerts, setConcerts] = useState([]);
  const [countdowns, setCountdowns] = useState({});

  // 模拟演唱会数据
  const mockConcerts = [
    {
      id: 1,
      title: '数字诗篇 - 虚拟演唱会',
      subtitle: '董小姐M98首场VR沉浸式音乐体验',
      image: resolvePoster(0),
      date: '2025-07-15T20:00:00Z',
      venue: '元宇宙音乐厅',
      type: 'vr',
      isLive: false,
      isFeatured: true,
      capacity: 50000,
      ticketPrice: 'VR设备 + 38元',
      description: '史上首场融合古典诗词与电子音乐的VR演唱会，观众可以沉浸在董小姐构建的数字音乐宇宙中。',
      features: ['360°全景', 'AI交互', '多感官体验', '限量NFT']
    },
    {
      id: 2,
      title: '午夜电台 - 直播间',
      subtitle: '每周三晚与董小姐的深夜对话',
      image: resolvePoster(1),
      date: '2025-07-09T23:00:00Z',
      venue: '直播平台',
      type: 'live',
      isLive: true,
      isFeatured: false,
      capacity: 10000,
      ticketPrice: '免费',
      description: '在深夜的电波中，董小姐分享创作灵感、人生感悟，与粉丝进行最真实的交流。',
      features: ['实时互动', '音乐首播', '创作故事', 'Q&A环节']
    },
    {
      id: 3,
      title: '东方未来 - 音乐节',
      subtitle: '传统与科技的完美融合',
      image: resolvePoster(2),
      date: '2025-08-20T19:00:00Z',
      venue: '上海世博文化公园',
      type: 'hybrid',
      isLive: false,
      isFeatured: true,
      capacity: 20000,
      ticketPrice: '线下188元 / VR38元',
      description: '线上线下同步的音乐节，现场观众与虚拟观众共同参与，体验前所未有的音乐盛宴。',
      features: ['线下+VR', 'AR互动', '全息投影', '多位嘉宾']
    }
  ];

  useEffect(() => {
    setConcerts(mockConcerts);
    
    // 启动倒计时
    const interval = setInterval(() => {
      const newCountdowns = {};
      mockConcerts.forEach(concert => {
        const targetTime = new Date(concert.date).getTime();
        const now = new Date().getTime();
        const timeDiff = targetTime - now;
        
        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          newCountdowns[concert.id] = { days, hours, minutes, seconds };
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleBookTicket = (concert) => {
    console.log('预订门票:', concert.title);
    // 实际的票务逻辑
  };

  const handleReminder = (concertId) => {
    console.log('设置提醒:', concertId);
    // 实际的提醒设置逻辑
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'vr': return 'VR体验';
      case 'live': return '直播';
      case 'hybrid': return '混合现实';
      default: return '演出';
    }
  };

  return (
    <ConcertContainer>
      <BackgroundEffect />
      <ContentWrapper>
        <SectionTitle>虚拟演唱会 & 直播预告</SectionTitle>
        
        <ConcertGrid>
          {concerts.map((concert, index) => (
            <ConcertCard
              key={concert.id}
              className={concert.isFeatured ? 'featured' : ''}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <ConcertImage>
                <img 
                  src={concert.image} 
                  alt={concert.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'linear-gradient(45deg, #8A2BE2, #FF6B6B)';
                  }}
                />
                <div className="overlay" />
                {concert.isLive && (
                  <div className="live-indicator">🔴 正在直播</div>
                )}
                {concert.type === 'vr' && (
                  <div className="vr-badge">🥽 VR</div>
                )}
              </ConcertImage>
              
              <ConcertInfo>
                <ConcertTitle>{concert.title}</ConcertTitle>
                <ConcertSubtitle>{concert.subtitle}</ConcertSubtitle>
                
                <ConcertMeta>
                  <MetaItem>
                    <span className="icon">📅</span>
                    <span>{formatDate(concert.date)}</span>
                  </MetaItem>
                  <MetaItem>
                    <span className="icon">📍</span>
                    <span>{concert.venue}</span>
                  </MetaItem>
                  <MetaItem>
                    <span className="icon">🎫</span>
                    <span>{concert.ticketPrice}</span>
                  </MetaItem>
                  <MetaItem>
                    <span className="icon">👥</span>
                    <span>{concert.capacity.toLocaleString()}人 • {getTypeLabel(concert.type)}</span>
                  </MetaItem>
                </ConcertMeta>
                
                {countdowns[concert.id] && (
                  <CountdownContainer>
                    <CountdownTitle>距离开始还有</CountdownTitle>
                    <CountdownTime>
                      <TimeUnit>
                        <div className="number">{countdowns[concert.id].days}</div>
                        <div className="label">天</div>
                      </TimeUnit>
                      <TimeUnit>
                        <div className="number">{countdowns[concert.id].hours}</div>
                        <div className="label">时</div>
                      </TimeUnit>
                      <TimeUnit>
                        <div className="number">{countdowns[concert.id].minutes}</div>
                        <div className="label">分</div>
                      </TimeUnit>
                      <TimeUnit>
                        <div className="number">{countdowns[concert.id].seconds}</div>
                        <div className="label">秒</div>
                      </TimeUnit>
                    </CountdownTime>
                  </CountdownContainer>
                )}
                
                <ActionButtons>
                  <ActionButton
                    primary
                    onClick={() => handleBookTicket(concert)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {concert.isLive ? '🔴 立即观看' : '🎫 预订门票'}
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleReminder(concert.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔔 提醒我
                  </ActionButton>
                </ActionButtons>
              </ConcertInfo>
            </ConcertCard>
          ))}
        </ConcertGrid>
      </ContentWrapper>
    </ConcertContainer>
  );
};

export default VirtualConcertHub;
