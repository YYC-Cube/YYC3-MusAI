import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import apiService from '../../services/apiService';
import { resolveCover } from '../../config/assets';

const LatestReleases = ({ releases }) => {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);

  const handlePlayTrack = async (track, release) => {
    try {
      // 记录播放统计
      await apiService.playTrack(release.id, 'web-player', 'LatestReleases');
      setPlayingTrack(track);
      
      // 这里可以集成实际的音频播放逻辑
      console.log('播放曲目:', track.title);
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  if (!releases || releases.length === 0) {
    return (
      <ReleasesContainer>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          最新作品
        </motion.h2>
        <EmptyState>
          <p>暂无作品，敬请期待董小姐的新作品</p>
        </EmptyState>
      </ReleasesContainer>
    );
  }

  return (
    <ReleasesContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        最新作品 <span className="subtitle">Latest Releases</span>
      </motion.h2>
      
      <div className="releases-grid">
        {releases.map((release, index) => (
          <motion.div
            key={release.id}
            className="release-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="release-cover">
              <img 
                src={resolveCover(index)} 
                alt={release.title}
                onError={(e) => {
                  e.target.src = resolveCover(0);
                }}
              />
              <div className="play-overlay">
                <motion.button
                  className="play-button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handlePlayTrack(release.tracks[0], release)}
                >
                  {playingTrack?.title === release.tracks[0]?.title ? '⏸' : '▶'}
                </motion.button>
              </div>
              <div className="release-type">
                {release.type === 'single' ? '单曲' : release.type === 'album' ? '专辑' : 'EP'}
              </div>
            </div>
            
            <div className="release-info">
              <h3>{release.title}</h3>
              <p className="release-date">
                {new Date(release.releaseDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              {release.tracks && release.tracks.length > 0 && (
                <div className="track-info">
                  <span className="duration">
                    {Math.floor(release.tracks[0].duration / 60)}:
                    {(release.tracks[0].duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              
              <div className="release-stats">
                <motion.span 
                  className="stat-item"
                  whileHover={{ scale: 1.05 }}
                >
                  🎵 {formatNumber(release.stats.plays)}
                </motion.span>
                <motion.span 
                  className="stat-item"
                  whileHover={{ scale: 1.05 }}
                >
                  💾 {formatNumber(release.stats.downloads)}
                </motion.span>
                <motion.span 
                  className="stat-item"
                  whileHover={{ scale: 1.05 }}
                >
                  📤 {formatNumber(release.stats.shares)}
                </motion.span>
              </div>
              
              <div className="action-buttons">
                <motion.button
                  className="action-btn primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePlayTrack(release.tracks[0], release)}
                >
                  立即播放
                </motion.button>
                <motion.button
                  className="action-btn secondary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  添加到播放列表
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 查看更多按钮 */}
      <motion.div
        className="view-more"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <motion.button
          className="view-more-btn"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          查看更多作品 →
        </motion.button>
      </motion.div>
    </ReleasesContainer>
  );
};

// 工具函数
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Styled Components
const ReleasesContainer = styled.section`
  padding: 6rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(180deg, transparent 0%, rgba(138, 43, 226, 0.05) 50%, transparent 100%);
  
  h2 {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 4rem;
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
  
  .releases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 3rem;
    margin-bottom: 4rem;
    
    .release-card {
      background: rgba(22, 27, 34, 0.8);
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(138, 43, 226, 0.2);
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      backdrop-filter: blur(10px);
      
      &:hover {
        border-color: #8A2BE2;
        box-shadow: 
          0 20px 40px rgba(138, 43, 226, 0.2),
          0 0 0 1px rgba(138, 43, 226, 0.1);
        transform: translateY(-5px);
        
        .play-overlay {
          opacity: 1;
        }
        
        .release-cover img {
          transform: scale(1.05);
        }
      }
      
      .release-cover {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        
        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          backdrop-filter: blur(5px);
          
          .play-button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
            border: none;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(138, 43, 226, 0.4);
            transition: all 0.3s ease;
            
            &:hover {
              box-shadow: 0 15px 40px rgba(138, 43, 226, 0.6);
            }
          }
        }
        
        .release-type {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(138, 43, 226, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }
      }
      
      .release-info {
        padding: 2rem;
        
        h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: white;
          font-weight: 600;
          line-height: 1.3;
        }
        
        .release-date {
          color: #B8BCC8;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        
        .track-info {
          margin-bottom: 1.5rem;
          
          .duration {
            display: inline-block;
            background: rgba(138, 43, 226, 0.1);
            color: #8A2BE2;
            padding: 0.25rem 0.75rem;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 500;
          }
        }
        
        .release-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          
          .stat-item {
            font-size: 0.85rem;
            color: #8B949E;
            cursor: pointer;
            transition: color 0.3s ease;
            
            &:hover {
              color: #FF6B6B;
            }
          }
        }
        
        .action-buttons {
          display: flex;
          gap: 1rem;
          
          .action-btn {
            flex: 1;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 25px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            
            &.primary {
              background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
              color: white;
              
              &:hover {
                box-shadow: 0 5px 15px rgba(138, 43, 226, 0.4);
              }
            }
            
            &.secondary {
              background: transparent;
              color: #8A2BE2;
              border: 1px solid #8A2BE2;
              
              &:hover {
                background: rgba(138, 43, 226, 0.1);
              }
            }
          }
        }
      }
    }
  }
  
  .view-more {
    text-align: center;
    
    .view-more-btn {
      background: transparent;
      border: 2px solid #8A2BE2;
      color: #8A2BE2;
      padding: 1rem 2rem;
      border-radius: 30px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #8A2BE2;
        color: white;
        box-shadow: 0 10px 25px rgba(138, 43, 226, 0.3);
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #B8BCC8;
  
  p {
    font-size: 1.1rem;
    margin: 0;
  }
`;

export default LatestReleases;
