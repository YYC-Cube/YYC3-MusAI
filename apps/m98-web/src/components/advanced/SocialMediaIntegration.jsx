import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { resolvePoster } from '../../config/assets';

const SocialContainer = styled.div`
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

const SocialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
`;

const SocialCard = styled(motion.div)`
  background: rgba(22, 27, 34, 0.8);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(139, 148, 158, 0.2);
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
  }
`;

const SocialHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
`;

const SocialIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: ${props => props.bgColor || 'var(--gradient-primary)'};
  color: white;
`;

const SocialMeta = styled.div`
  flex: 1;
  
  h3 {
    color: var(--text-primary);
    font-size: var(--text-lg);
    margin: 0 0 4px 0;
    font-weight: 600;
  }
  
  p {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin: 0;
  }
`;

const SocialContent = styled.div`
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
  
  .content-text {
    margin-bottom: var(--spacing-sm);
  }
  
  .content-image {
    width: 100%;
    border-radius: var(--radius-md);
    margin: var(--spacing-sm) 0;
  }
  
  .hashtags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
  }
  
  .hashtag {
    background: rgba(138, 43, 226, 0.2);
    color: var(--primary-purple);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
  }
`;

const SocialStats = styled.div`
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--text-secondary);
`;

const StatItem = styled(motion.span)`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  
  &:hover {
    color: var(--primary-purple);
  }
`;

const LoadMoreButton = styled(motion.button)`
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  margin: var(--spacing-lg) auto 0;
  display: block;
  transition: var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-primary);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SocialMediaIntegration = () => {
  const [socialPosts, setSocialPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 模拟社交媒体数据
  const mockSocialData = [
    {
      id: 1,
      platform: 'weibo',
      platformName: '微博',
      icon: '🐾',
      bgColor: '#E6162D',
      author: '董小姐M98',
      timestamp: '2小时前',
      content: '刚完成了新单曲《数字诗篇》的最后修音，这首作品融合了古典诗词与现代电子音乐，希望能带给大家不一样的听觉体验 🎵✨',
      image: resolvePoster(0),
      hashtags: ['#数字诗篇', '#董小姐M98', '#电子融合', '#新单曲'],
      stats: { likes: 1823, comments: 245, shares: 167 }
    },
    {
      id: 2,
      platform: 'douyin',
      platformName: '抖音',
      icon: '🎵',
      bgColor: '#000000',
      author: '董小姐M98',
      timestamp: '6小时前',
      content: '创作过程揭秘：从古琴采样到电子编曲，每一个音符都承载着东方美学的灵魂。音乐是时间的诗歌，科技是传统的延续。',
      hashtags: ['#创作过程', '#东方美学', '#音乐科技', '#董小姐'],
      stats: { likes: 5674, comments: 421, shares: 298 }
    },
    {
      id: 3,
      platform: 'bilibili',
      platformName: '哔哩哔哩',
      icon: '📺',
      bgColor: '#00A1D6',
      author: '董小姐M98',
      timestamp: '1天前',
      content: '新视频上线！《我的音乐宇宙》系列第三集：如何用AI辅助创作既保持人文情怀又具有未来感的音乐。科技与艺术的完美结合 🤖🎨',
      hashtags: ['#音乐宇宙', '#AI创作', '#科技艺术', '#董小姐M98'],
      stats: { likes: 3421, comments: 567, shares: 234 }
    },
    {
      id: 4,
      platform: 'xiaohongshu',
      platformName: '小红书',
      icon: '📱',
      bgColor: '#FF2442',
      author: '董小姐M98',
      timestamp: '2天前',
      content: '分享我的工作室布置心得：每一件乐器、每一个装饰都有它的故事。古筝与合成器的对话，传统与现代的融合，这就是我的创作空间 🏡🎼',
      image: resolvePoster(1),
      hashtags: ['#工作室', '#音乐创作', '#传统现代', '#生活美学'],
      stats: { likes: 2156, comments: 189, shares: 143 }
    }
  ];

  useEffect(() => {
    loadSocialPosts();
  }, []);

  const loadSocialPosts = async () => {
    setLoading(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSocialPosts(mockSocialData);
    setLoading(false);
  };

  const loadMorePosts = async () => {
    setLoading(true);
    // 模拟加载更多
    await new Promise(resolve => setTimeout(resolve, 1000));
    setHasMore(false);
    setLoading(false);
  };

  const formatTime = (timestamp) => {
    return timestamp;
  };

  const handleInteraction = (type, postId) => {
    console.log(`${type} interaction on post ${postId}`);
    // 这里可以添加实际的交互逻辑
  };

  return (
    <SocialContainer>
      <SectionTitle>社交动态</SectionTitle>
      
      <SocialGrid>
        <AnimatePresence>
          {socialPosts.map((post, index) => (
            <SocialCard
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <SocialHeader>
                <SocialIcon bgColor={post.bgColor}>
                  {post.icon}
                </SocialIcon>
                <SocialMeta>
                  <h3>{post.platformName}</h3>
                  <p>{post.author} • {formatTime(post.timestamp)}</p>
                </SocialMeta>
              </SocialHeader>
              
              <SocialContent>
                <div className="content-text">{post.content}</div>
                {post.image && (
                  <img 
                    src={post.image} 
                    alt="Social post" 
                    className="content-image"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                {post.hashtags && (
                  <div className="hashtags">
                    {post.hashtags.map((tag, i) => (
                      <span key={i} className="hashtag">{tag}</span>
                    ))}
                  </div>
                )}
              </SocialContent>
              
              <SocialStats>
                <StatItem
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleInteraction('like', post.id)}
                >
                  ❤️ {post.stats.likes.toLocaleString()}
                </StatItem>
                <StatItem
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleInteraction('comment', post.id)}
                >
                  💬 {post.stats.comments.toLocaleString()}
                </StatItem>
                <StatItem
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleInteraction('share', post.id)}
                >
                  📤 {post.stats.shares.toLocaleString()}
                </StatItem>
              </SocialStats>
            </SocialCard>
          ))}
        </AnimatePresence>
      </SocialGrid>
      
      {hasMore && (
        <LoadMoreButton
          onClick={loadMorePosts}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? '加载中...' : '查看更多动态'}
        </LoadMoreButton>
      )}
      
      {!hasMore && (
        <div style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          margin: 'var(--spacing-lg) 0'
        }}>
          已显示所有动态 ✨
        </div>
      )}
    </SocialContainer>
  );
};

export default SocialMediaIntegration;
