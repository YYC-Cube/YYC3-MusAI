import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { resolvePoster } from '../../config/assets';
import apiService from '../../services/apiService';

const ExclusiveContent = () => {
  const [selectedContent, setSelectedContent] = useState(null);
  const [subscribed, setSubscribed] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getExclusiveContent();
      setItems(response.data.data || []);
    } catch (err) {
      console.error('独家内容加载失败:', err);
      setError('独家内容加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const exclusiveContent = items.map((item, index) => ({
    ...item,
    locked: Boolean(item.isLocked) && !subscribed,
    thumbnail: item.thumbnail || resolvePoster(index),
    preview: item.description,
    tags: item.tags || [
      item.type === 'audio' ? '音频' : '视频',
      item.isLocked ? '会员专属' : '免费'
    ]
  }));

  const handleSubscribe = () => {
    setSubscribed(true);
    // 这里可以集成实际的订阅逻辑
    console.log('用户订阅独家内容');
  };

  const contentTypeLabels = {
    video: '视频',
    audio: '音频',
    'behind-scenes': '幕后花絮',
    'philosophy': '音乐哲学',
    'early-access': '抢先体验',
    'live-session': '现场录音'
  };

  return (
    <ExclusiveContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        独家内容 <span className="subtitle">Exclusive Content</span>
      </motion.h2>

      <div className="content-description">
        <p>
          深入董小姐的音乐世界，探索创作背后的故事与哲思。
          这里有最真实的创作过程、最深刻的音乐理念，以及最前沿的实验作品。
        </p>
      </div>

      {!subscribed && (
        <motion.div
          className="subscription-banner"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="banner-content">
            <h3>🔓 解锁专属体验</h3>
            <p>成为M98会员，获得独家内容访问权限</p>
            <div className="benefits">
              <span>✨ 创作幕后独家视频</span>
              <span>🎵 新作品抢先试听</span>
              <span>💭 音乐哲学深度分享</span>
              <span>🎤 私密现场录音</span>
            </div>
            <motion.button
              className="subscribe-btn"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubscribe}
            >
              立即订阅会员
            </motion.button>
          </div>
          <div className="banner-visual">
            <div className="floating-notes">
              <span>♪</span>
              <span>♫</span>
              <span>♪</span>
              <span>♫</span>
            </div>
          </div>
        </motion.div>
      )}

      {loading && <div className="content-status">正在加载独家内容…</div>}
      {error && (
        <div className="content-status error">
          <span>{error}</span>
          <button type="button" onClick={fetchContent}>重试</button>
        </div>
      )}
      {!loading && !error && exclusiveContent.length === 0 && (
        <div className="content-status">暂无独家内容</div>
      )}

      <div className="content-grid">
        {exclusiveContent.map((content, index) => (
          <motion.div
            key={content.id}
            className={`content-card ${content.locked ? 'locked' : ''}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: content.locked ? 1 : 1.02, y: content.locked ? 0 : -5 }}
            onClick={() => !content.locked && setSelectedContent(content)}
          >
            <div className="content-thumbnail">
              <img 
                src={resolvePoster(index)} 
                alt={content.title}
                onError={(e) => {
                  e.target.src = resolvePoster(0);
                }}
              />
              <div className="content-overlay">
                {content.locked ? (
                  <div className="lock-icon">🔒</div>
                ) : (
                  <motion.div
                    className="play-icon"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ▶
                  </motion.div>
                )}
              </div>
              <div className="content-type">
                {contentTypeLabels[content.type]}
              </div>
              <div className="content-duration">
                {content.duration}
              </div>
            </div>

            <div className="content-info">
              <h3>{content.title}</h3>
              <p className="content-description">{content.description}</p>
              
              {!content.locked && (
                <div className="content-preview">
                  <p>"{content.preview || content.description}"</p>
                </div>
              )}

              <div className="content-tags">
                {(content.tags || []).map((tag, tagIndex) => (
                  <span key={tagIndex} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              {content.locked ? (
                <div className="locked-message">
                  <p>🔒 {content.unlockCondition || '订阅会员解锁'}</p>
                </div>
              ) : (
                <motion.button
                  className="view-content-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContent(content);
                  }}
                >
                  立即观看
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 内容详情模态框 */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            className="content-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedContent(null)}
          >
            <motion.div
              className="content-modal"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{selectedContent.title}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedContent(null)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-content">
                <div className="video-container">
                  <img 
                    src={selectedContent.thumbnail || resolvePoster(0)} 
                    alt={selectedContent.title}
                    onError={(e) => {
                      e.target.src = resolvePoster(0);
                    }}
                  />
                  <div className="video-controls">
                    <button className="play-btn">▶ 播放</button>
                    <span className="duration">{selectedContent.duration}</span>
                  </div>
                </div>
                
                <div className="content-details">
                  <p className="description">{selectedContent.description}</p>
                  <div className="full-preview">
                    <h4>内容预览</h4>
                    <p>"{selectedContent.preview || selectedContent.description}"</p>
                  </div>
                  <div className="tags">
                    {(selectedContent.tags || []).map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 更多内容提示 */}
      <motion.div
        className="more-content"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <p>更多独家内容持续更新中...</p>
        <div className="coming-soon">
          <span>🎬 制作纪录片</span>
          <span>🎼 音乐课程</span>
          <span>💫 互动直播</span>
        </div>
      </motion.div>
    </ExclusiveContainer>
  );
};

// Styled Components
const ExclusiveContainer = styled.section`
  padding: 6rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(180deg, 
    transparent 0%, 
    rgba(138, 43, 226, 0.03) 30%, 
    rgba(255, 107, 107, 0.03) 70%, 
    transparent 100%);
  
  h2 {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 2rem;
    background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    
    .subtitle {
      display: block;
      font-size: 1rem;
      font-weight: 300;
      color: #B8BCC8;
      margin-top: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: -1rem;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, #8A2BE2, #FF6B6B);
      border-radius: 1px;
    }
  }
  
  .content-description {
    text-align: center;
    max-width: 800px;
    margin: 0 auto 4rem auto;
    
    p {
      color: #B8BCC8;
      font-size: 1.1rem;
      line-height: 1.7;
    }
  }
  
  .subscription-banner {
    background: linear-gradient(135deg, 
      rgba(138, 43, 226, 0.1) 0%, 
      rgba(255, 107, 107, 0.1) 100%);
    border: 1px solid rgba(138, 43, 226, 0.3);
    border-radius: 20px;
    padding: 3rem;
    margin-bottom: 4rem;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
    
    .banner-content {
      position: relative;
      z-index: 2;
      text-align: center;
      
      h3 {
        font-size: 2rem;
        margin-bottom: 1rem;
        background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      p {
        color: #B8BCC8;
        font-size: 1.1rem;
        margin-bottom: 2rem;
      }
      
      .benefits {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
        
        span {
          color: #E6EDF3;
          font-size: 0.9rem;
          padding: 0.5rem;
        }
      }
      
      .subscribe-btn {
        background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
        color: white;
        border: none;
        padding: 1.25rem 3rem;
        border-radius: 30px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          box-shadow: 0 15px 35px rgba(138, 43, 226, 0.4);
        }
      }
    }
    
    .banner-visual {
      position: absolute;
      top: 0;
      right: 0;
      width: 200px;
      height: 100%;
      
      .floating-notes {
        position: relative;
        width: 100%;
        height: 100%;
        
        span {
          position: absolute;
          color: rgba(138, 43, 226, 0.3);
          font-size: 2rem;
          animation: float 3s ease-in-out infinite;
          
          &:nth-child(1) {
            top: 20%;
            right: 20%;
            animation-delay: 0s;
          }
          
          &:nth-child(2) {
            top: 40%;
            right: 40%;
            animation-delay: 0.5s;
          }
          
          &:nth-child(3) {
            top: 60%;
            right: 60%;
            animation-delay: 1s;
          }
          
          &:nth-child(4) {
            top: 80%;
            right: 30%;
            animation-delay: 1.5s;
          }
        }
      }
    }
  }
  
  .content-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 1rem;
    color: #B8BCC8;
    font-size: 1rem;

    &.error {
      color: #FF6B6B;
    }

    button {
      background: rgba(138, 43, 226, 0.16);
      border: 1px solid rgba(138, 43, 226, 0.35);
      color: #E6EDF3;
      border-radius: 999px;
      padding: 0.6rem 1.4rem;
      cursor: pointer;
    }
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2.5rem;
    margin-bottom: 4rem;
    
    .content-card {
      background: rgba(22, 27, 34, 0.8);
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(138, 43, 226, 0.2);
      transition: all 0.4s ease;
      cursor: pointer;
      
      &.locked {
        opacity: 0.7;
        cursor: not-allowed;
        
        &:hover {
          transform: none;
        }
      }
      
      &:not(.locked):hover {
        border-color: #8A2BE2;
        box-shadow: 0 20px 40px rgba(138, 43, 226, 0.2);
      }
      
      .content-thumbnail {
        position: relative;
        aspect-ratio: 16/9;
        overflow: hidden;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        
        .content-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          
          .play-icon, .lock-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
          }
          
          .play-icon {
            background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
          }
          
          .lock-icon {
            background: rgba(139, 148, 158, 0.8);
          }
        }
        
        &:hover .content-overlay {
          opacity: 1;
        }
        
        .content-type {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(138, 43, 226, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .content-duration {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 10px;
          font-size: 0.8rem;
        }
      }
      
      .content-info {
        padding: 2rem;
        
        h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1.3rem;
          color: white;
          line-height: 1.4;
        }
        
        .content-description {
          color: #B8BCC8;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        
        .content-preview {
          background: rgba(138, 43, 226, 0.1);
          border-left: 3px solid #8A2BE2;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 0 10px 10px 0;
          
          p {
            margin: 0;
            font-style: italic;
            color: #E6EDF3;
            font-size: 0.9rem;
            line-height: 1.5;
          }
        }
        
        .content-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          
          .tag {
            background: rgba(255, 107, 107, 0.2);
            color: #FF6B6B;
            padding: 0.25rem 0.75rem;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 500;
          }
        }
        
        .locked-message {
          text-align: center;
          padding: 1rem;
          
          p {
            color: #8B949E;
            margin: 0;
            font-size: 0.9rem;
          }
        }
        
        .view-content-btn {
          width: 100%;
          background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          
          &:hover {
            box-shadow: 0 5px 15px rgba(138, 43, 226, 0.4);
          }
        }
      }
    }
  }
  
  .more-content {
    text-align: center;
    padding: 3rem 2rem;
    
    p {
      color: #B8BCC8;
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }
    
    .coming-soon {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
      
      span {
        color: #8B949E;
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
        background: rgba(139, 148, 158, 0.1);
        border-radius: 15px;
      }
    }
  }
  
  /* 模态框样式 */
  .content-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(10px);
  }
  
  .content-modal {
    background: rgba(22, 27, 34, 0.95);
    border-radius: 20px;
    max-width: 800px;
    width: 90%;
    max-height: 90%;
    overflow: hidden;
    border: 1px solid rgba(138, 43, 226, 0.3);
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2rem 2rem 1rem 2rem;
      border-bottom: 1px solid rgba(138, 43, 226, 0.2);
      
      h3 {
        margin: 0;
        color: white;
        flex: 1;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: #8B949E;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        
        &:hover {
          color: white;
        }
      }
    }
    
    .modal-content {
      padding: 2rem;
      overflow-y: auto;
      
      .video-container {
        position: relative;
        margin-bottom: 2rem;
        
        img {
          width: 100%;
          border-radius: 10px;
        }
        
        .video-controls {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          
          .play-btn {
            background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
          }
          
          .duration {
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 15px;
          }
        }
      }
      
      .content-details {
        .description {
          color: #E6EDF3;
          font-size: 1.1rem;
          line-height: 1.7;
          margin-bottom: 2rem;
        }
        
        .full-preview {
          background: rgba(138, 43, 226, 0.1);
          border-left: 3px solid #8A2BE2;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border-radius: 0 10px 10px 0;
          
          h4 {
            margin: 0 0 1rem 0;
            color: white;
            font-size: 1.1rem;
          }
          
          p {
            margin: 0;
            font-style: italic;
            color: #E6EDF3;
            line-height: 1.6;
          }
        }
        
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          
          .tag {
            background: rgba(255, 107, 107, 0.2);
            color: #FF6B6B;
            padding: 0.5rem 1rem;
            border-radius: 15px;
            font-size: 0.9rem;
            font-weight: 500;
          }
        }
      }
    }
  }

  @keyframes float {
    0%, 100% { 
      transform: translateY(0px) rotate(0deg); 
      opacity: 0.3;
    }
    50% { 
      transform: translateY(-20px) rotate(180deg); 
      opacity: 0.8;
    }
  }
`;

export default ExclusiveContent;
