import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import apiService from '../services/apiService';
import ASSETS, { resolveCover } from '../config/assets';
import DynamicBackground from '../components/advanced/DynamicBackground';
import AdvancedMusicPlayer from '../components/advanced/AdvancedMusicPlayer';
import FanInteractionHub from '../components/advanced/FanInteractionHub';
import SocialMediaIntegration from '../components/advanced/SocialMediaIntegration';
import VirtualConcertHub from '../components/advanced/VirtualConcertHub';
import AICreationShowcase from '../components/advanced/AICreationShowcase';
import MusicDataAnalytics from '../components/advanced/MusicDataAnalytics';
import ExclusiveContent from '../components/social/ExclusiveContent';
import ContentFeed from '../components/social/ContentFeed';

// 音乐可视化组件
const MusicVisualizer = ({ isPlaying, trackData }) => {
  const [bars, setBars] = useState(Array(64).fill(0));

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.random() * 100));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return (
    <VisualizerContainer>
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="bar"
          animate={{ height: `${height}%` }}
          transition={{ duration: 0.1 }}
          style={{
            background: `linear-gradient(0deg, #8A2BE2 0%, #FF6B6B ${height}%)`,
            opacity: 0.7 + (height / 100) * 0.3
          }}
        />
      ))}
    </VisualizerContainer>
  );
};

// 主音乐播放器组件
const EnhancedMusicPlayer = ({ currentTrack, playlist, onTrackChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const togglePlay = async () => {
    if (currentTrack && !isPlaying) {
      // 记录播放统计
      await apiService.playTrack(currentTrack.id, 'web-player', 'HomePage');
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <PlayerContainer>
      <motion.div 
        className="now-playing"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {currentTrack && (
          <>
            <div className="track-info">
              <motion.img 
                src={currentTrack.coverArt || ASSETS.brand.logo}
                alt={currentTrack.title}
                className="cover-art"
                whileHover={{ scale: 1.05 }}
              />
              <div className="track-details">
                <h3>{currentTrack.title}</h3>
                <p>董小姐 M98</p>
                <div className="track-meta">
                  <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}</span>
                  <span>•</span>
                  <span>{currentTrack.genre || '电子融合'}</span>
                </div>
              </div>
            </div>
            
            <MusicVisualizer isPlaying={isPlaying} trackData={currentTrack} />
            
            <div className="player-controls">
              <motion.button 
                className="prev-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ⏮
              </motion.button>
              
              <motion.button 
                className="play-btn"
                onClick={togglePlay}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isPlaying ? '⏸' : '▶'}
              </motion.button>
              
              <motion.button 
                className="next-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ⏭
              </motion.button>
            </div>
            
            <div className="progress-section">
              <div className="progress-bar">
                <motion.div 
                  className="progress-fill"
                  animate={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="time-display">
                <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </PlayerContainer>
  );
};

// 增强版艺术家英雄区组件
const EnhancedArtistHero = ({ artistData }) => {
  const [currentQuote, setCurrentQuote] = useState(0);
  
  const philosophicalQuotes = [
    "音乐是时间的诗歌，是情感的数字化表达",
    "在电子与传统的交融中，寻找东方美学的未来语言",
    "每一个音符都是宇宙的振动，每一段旋律都是心灵的对话",
    "用科技编织古典的梦境，让传统在未来中重生"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % philosophicalQuotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!artistData) {
    return <HeroSkeleton />;
  }

  return (
    <HeroContainer>
      <ParticleBackground />
      
      <motion.div 
        className="hero-content"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <div className="artist-avatar">
          <motion.img 
            src={ASSETS.brand.logo}
            alt={artistData.name}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
          <div className="avatar-glow"></div>
        </div>
        
        <motion.div 
          className="artist-info"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1>
            <span className="name">{artistData.name}</span>
            <span className="id">M98</span>
          </h1>
          
          <motion.p 
            className="philosophy-quote"
            key={currentQuote}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            "{philosophicalQuotes[currentQuote]}"
          </motion.p>
          
          <div className="genres">
            {artistData.genres.map((genre, index) => (
              <motion.span 
                key={genre}
                className="genre-tag"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                {genre}
              </motion.span>
            ))}
          </div>
          
          <motion.div 
            className="stats-grid"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="stat-item">
              <motion.span 
                className="stat-value"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                {formatNumber(artistData.stats.followers)}
              </motion.span>
              <span className="stat-label">追随者</span>
            </div>
            <div className="stat-item">
              <motion.span 
                className="stat-value"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
              >
                {formatNumber(artistData.stats.monthlyListeners)}
              </motion.span>
              <span className="stat-label">月度聆听</span>
            </div>
            <div className="stat-item">
              <motion.span 
                className="stat-value"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.0, type: "spring" }}
              >
                {formatNumber(artistData.stats.totalPlays)}
              </motion.span>
              <span className="stat-label">总播放量</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="social-links"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            {artistData.socialLinks.weibo && (
              <motion.a 
                href={artistData.socialLinks.weibo}
                className="social-link weibo"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                微博
              </motion.a>
            )}
            {artistData.socialLinks.douyin && (
              <motion.a 
                href={`https://www.douyin.com/${artistData.socialLinks.douyin}`}
                className="social-link douyin"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                抖音
              </motion.a>
            )}
            {artistData.socialLinks.bilibili && (
              <motion.a 
                href={artistData.socialLinks.bilibili}
                className="social-link bilibili"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                哔哩哔哩
              </motion.a>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </HeroContainer>
  );
};

// 音乐作品展示组件
const LatestReleases = ({ releases, onTrackSelect }) => {
  const [selectedTrack, setSelectedTrack] = useState(null);

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    onTrackSelect?.(track);
  };

  return (
    <ReleasesContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        最新作品
      </motion.h2>
      
      <div className="releases-grid">
        {releases.map((release, index) => (
          <motion.div
            key={release.id || index}
            className="release-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            onClick={() => handleTrackSelect(index)}
          >
            <div className="release-cover">
              <img src={resolveCover(index)} alt={release.title} />
              <div className="play-overlay">
                <motion.button
                  className="play-button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ▶
                </motion.button>
              </div>
            </div>
            
            <div className="release-info">
              <h3>{release.title}</h3>
              <p className="release-date">{new Date(release.releaseDate).toLocaleDateString('zh-CN')}</p>
              <div className="release-stats">
                <span>🎵 {formatNumber(release.stats.plays)} 播放</span>
                <span>💾 {formatNumber(release.stats.downloads)} 下载</span>
                <span>📤 {formatNumber(release.stats.shares)} 分享</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </ReleasesContainer>
  );
};

// 粉丝墙组件
const FanWall = ({ fansWall }) => {
  return (
    <FanWallContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        粉丝心声
      </motion.h2>
      
      <div className="fan-messages">
        {fansWall.map((message, index) => (
          <motion.div
            key={message.id}
            className="fan-message"
            initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="message-header">
              <img src={resolveCover(index)} alt={message.username} />
              <div className="user-info">
                <h4>{message.username}</h4>
                <span className="timestamp">
                  {new Date(message.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
            <p className="message-text">{message.message}</p>
            <div className="message-footer">
              <motion.button
                className="like-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ❤️ {message.likes}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </FanWallContainer>
  );
};

// 工具函数
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// 主页组件
const HomePage = () => {
  const [artistData, setArtistData] = useState(null);
  const [releases, setReleases] = useState([]);
  const [fansWall, setFansWall] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(ASSETS.tracks[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [artistResponse, releasesResponse, fansWallResponse] = await Promise.all([
          apiService.getArtistProfile(),
          apiService.getReleases(),
          apiService.getFansWall()
        ]);

        setArtistData(artistResponse.data.data);
        setReleases(releasesResponse.data.data.releases);
        setFansWall(fansWallResponse.data.data);
        
        // 默认播放本地曲库首曲（public/D-Music）
        setCurrentTrack(ASSETS.tracks[0]);
        
      } catch (err) {
        console.error('❌ 数据加载失败:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    const currentIndex = ASSETS.tracks.findIndex(track => track.id === currentTrack?.id);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % ASSETS.tracks.length;
    setCurrentTrack(ASSETS.tracks[nextIndex]);
  };

  const handlePreviousTrack = () => {
    const currentIndex = ASSETS.tracks.findIndex(track => track.id === currentTrack?.id);
    const prevIndex = currentIndex <= 0 ? ASSETS.tracks.length - 1 : currentIndex - 1;
    setCurrentTrack(ASSETS.tracks[prevIndex]);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <HomePageContainer>
      <DynamicBackground musicPlaying={isPlaying} intensity={0.6} />
      
      <EnhancedArtistHero artistData={artistData} />
      <LatestReleases
        releases={releases}
        onTrackSelect={(index) => setCurrentTrack(ASSETS.tracks[index % ASSETS.tracks.length])}
      />
      <ExclusiveContent />
      <ContentFeed />
      <VirtualConcertHub />
      <AICreationShowcase />
      <MusicDataAnalytics />
      <FanWall fansWall={fansWall} />
      <FanInteractionHub />
      <SocialMediaIntegration />
      
      <AdvancedMusicPlayer 
        currentTrack={currentTrack}
        playlist={ASSETS.tracks}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrevious={handlePreviousTrack}
        onTrackChange={setCurrentTrack}
      />
    </HomePageContainer>
  );
};

// Styled Components
const HomePageContainer = styled.div`
  background: linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%);
  color: white;
  min-height: 100vh;
`;

const HeroContainer = styled.div`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;

  .hero-content {
    display: flex;
    align-items: center;
    gap: 4rem;
    max-width: 1200px;
    z-index: 2;
  }

  .artist-avatar {
    position: relative;
    
    img {
      width: 300px;
      height: 300px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #8A2BE2;
      box-shadow: 0 0 50px rgba(138, 43, 226, 0.5);
    }
    
    .avatar-glow {
      position: absolute;
      top: -20px;
      left: -20px;
      right: -20px;
      bottom: -20px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(138, 43, 226, 0.3) 0%, transparent 70%);
      animation: pulse 2s ease-in-out infinite;
    }
  }

  .artist-info {
    flex: 1;
    
    h1 {
      font-size: 4rem;
      margin-bottom: 1rem;
      
      .name {
        background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .id {
        color: #FF6B6B;
        font-weight: 300;
        margin-left: 1rem;
      }
    }
    
    .philosophy-quote {
      font-size: 1.2rem;
      font-style: italic;
      color: #B8BCC8;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    
    .genres {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      
      .genre-tag {
        background: rgba(138, 43, 226, 0.2);
        border: 1px solid #8A2BE2;
        padding: 0.5rem 1rem;
        border-radius: 25px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(138, 43, 226, 0.4);
          box-shadow: 0 5px 15px rgba(138, 43, 226, 0.3);
        }
      }
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      margin-bottom: 2rem;
      
      .stat-item {
        text-align: center;
        
        .stat-value {
          display: block;
          font-size: 2.5rem;
          font-weight: bold;
          color: #FF6B6B;
          line-height: 1;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #B8BCC8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      }
    }
    
    .social-links {
      display: flex;
      gap: 1rem;
      
      .social-link {
        padding: 0.75rem 1.5rem;
        border: 2px solid transparent;
        border-radius: 25px;
        text-decoration: none;
        color: white;
        font-weight: 500;
        transition: all 0.3s ease;
        
        &.weibo {
          background: linear-gradient(45deg, #E6162D, #FF6B6B);
        }
        
        &.douyin {
          background: linear-gradient(45deg, #000000, #333333);
        }
        
        &.bilibili {
          background: linear-gradient(45deg, #00A1D6, #0084FF);
        }
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
      }
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

const PlayerContainer = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  right: 2rem;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(138, 43, 226, 0.3);
  padding: 1.5rem;
  z-index: 1000;
  
  .now-playing {
    display: flex;
    align-items: center;
    gap: 2rem;
    
    .track-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      
      .cover-art {
        width: 60px;
        height: 60px;
        border-radius: 10px;
        object-fit: cover;
      }
      
      .track-details {
        h3 {
          margin: 0;
          font-size: 1.1rem;
          color: white;
        }
        
        p {
          margin: 0.25rem 0;
          color: #B8BCC8;
          font-size: 0.9rem;
        }
        
        .track-meta {
          display: flex;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #8B949E;
        }
      }
    }
    
    .player-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      button {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        
        &.play-btn {
          background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
          font-size: 1.2rem;
        }
        
        &:hover {
          background: rgba(138, 43, 226, 0.2);
        }
      }
    }
    
    .progress-section {
      flex: 1;
      max-width: 300px;
      
      .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        margin-bottom: 0.5rem;
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8A2BE2, #FF6B6B);
          border-radius: 2px;
        }
      }
      
      .time-display {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #B8BCC8;
      }
    }
  }
`;

const VisualizerContainer = styled.div`
  display: flex;
  align-items: end;
  gap: 2px;
  height: 40px;
  width: 200px;
  
  .bar {
    flex: 1;
    min-height: 2px;
    border-radius: 1px;
  }
`;

const ReleasesContainer = styled.section`
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  
  h2 {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 3rem;
    background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .releases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    
    .release-card {
      background: rgba(22, 27, 34, 0.8);
      border-radius: 15px;
      overflow: hidden;
      border: 1px solid rgba(138, 43, 226, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: #8A2BE2;
        box-shadow: 0 10px 30px rgba(138, 43, 226, 0.2);
        
        .play-overlay {
          opacity: 1;
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
          transition: transform 0.3s ease;
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
          }
        }
      }
      
      .release-info {
        padding: 1.5rem;
        
        h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
          color: white;
        }
        
        .release-date {
          color: #B8BCC8;
          margin-bottom: 1rem;
        }
        
        .release-stats {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          
          span {
            font-size: 0.8rem;
            color: #8B949E;
          }
        }
      }
    }
  }
`;

const FanWallContainer = styled.section`
  padding: 4rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
  
  h2 {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 3rem;
    background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .fan-messages {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    
    .fan-message {
      background: rgba(22, 27, 34, 0.6);
      border-radius: 15px;
      padding: 1.5rem;
      border: 1px solid rgba(138, 43, 226, 0.1);
      
      .message-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        
        img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .user-info {
          h4 {
            margin: 0;
            color: white;
            font-size: 1rem;
          }
          
          .timestamp {
            font-size: 0.8rem;
            color: #8B949E;
          }
        }
      }
      
      .message-text {
        margin-bottom: 1rem;
        line-height: 1.6;
        color: #E6EDF3;
      }
      
      .message-footer {
        display: flex;
        justify-content: flex-end;
        
        .like-btn {
          background: none;
          border: none;
          color: #FF6B6B;
          cursor: pointer;
          font-size: 0.9rem;
          transition: transform 0.2s ease;
          
          &:hover {
            transform: scale(1.1);
          }
        }
      }
    }
  }
`;

const ParticleBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('${ASSETS.posters[0]}') no-repeat center center;
  background-size: cover;
  opacity: 0.1;
  z-index: 1;
`;

const LoadingScreen = () => (
  <div style={{
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%)',
    color: 'white'
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ textAlign: 'center' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{
          width: '60px',
          height: '60px',
          border: '3px solid rgba(138, 43, 226, 0.3)',
          borderTop: '3px solid #8A2BE2',
          borderRadius: '50%',
          margin: '0 auto 1rem'
        }}
      />
      <h2>🎵 载入中...</h2>
      <p>正在进入董小姐的音乐宇宙</p>
    </motion.div>
  </div>
);

const ErrorScreen = ({ error }) => (
  <div style={{
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%)',
    color: 'white',
    textAlign: 'center'
  }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>❌ 连接失败</h2>
      <p>无法连接到音乐服务: {error}</p>
      <motion.button
        onClick={() => window.location.reload()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'linear-gradient(45deg, #8A2BE2, #FF6B6B)',
          border: 'none',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '25px',
          cursor: 'pointer',
          fontSize: '1rem',
          marginTop: '1rem'
        }}
      >
        重新连接
      </motion.button>
    </motion.div>
  </div>
);

const HeroSkeleton = () => (
  <HeroContainer>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
      <div style={{
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(138, 43, 226, 0.1)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div>
        <div style={{
          width: '400px',
          height: '60px',
          background: 'rgba(138, 43, 226, 0.1)',
          borderRadius: '10px',
          marginBottom: '1rem'
        }} />
        <div style={{
          width: '300px',
          height: '20px',
          background: 'rgba(138, 43, 226, 0.1)',
          borderRadius: '5px',
          marginBottom: '2rem'
        }} />
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: '80px',
              height: '30px',
              background: 'rgba(138, 43, 226, 0.1)',
              borderRadius: '15px'
            }} />
          ))}
        </div>
      </div>
    </div>
  </HeroContainer>
);

export default HomePage;
