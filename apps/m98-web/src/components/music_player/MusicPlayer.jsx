import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ASSETS from '../../config/assets';
import './MusicPlayer.css';

const MusicPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playlist, setPlaylist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef(null);

  // 获取音乐列表
  useEffect(() => {
    fetchMusicData();
  }, []);

  const fetchMusicData = async () => {
    try {
      const response = await fetch('/api/music/releases?limit=5');
      const data = await response.json();
      
      if (data.success && data.data.releases.length > 0) {
        setPlaylist(data.data.releases);
        setCurrentTrack(data.data.releases[0]);
      }
    } catch (error) {
      console.error('获取音乐数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => {
      setIsPlaying(false);
      // 自动播放下一首
      const currentIndex = playlist.findIndex(track => track._id === currentTrack._id);
      if (currentIndex < playlist.length - 1) {
        setCurrentTrack(playlist[currentIndex + 1]);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [currentTrack, playlist]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
        // 记录播放次数
        recordPlay(currentTrack._id);
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  const recordPlay = async (trackId) => {
    try {
      await fetch(`/api/music/${trackId}/play`, { method: 'POST' });
    } catch (error) {
      console.error('记录播放失败:', error);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const selectTrack = (track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="music-player loading">
        <div className="loading-spinner"></div>
        <p>加载音乐中...</p>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className="music-player empty">
        <p>暂无音乐作品</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="music-player"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <audio
        ref={audioRef}
        src={currentTrack.tracks[0]?.streamUrl}
        volume={volume}
      />

      {/* 当前播放信息 */}
      <div className="current-track">
        <div className="track-cover">
          <img 
            src={currentTrack.coverArt || ASSETS.brand.logo} 
            alt={currentTrack.title}
          />
          <div className="play-overlay">
            <motion.button
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={togglePlay}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </motion.button>
          </div>
        </div>
        
        <div className="track-info">
          <h3>{currentTrack.title}</h3>
          <p>董小姐 M98</p>
          <div className="track-stats">
            <span>▶ {currentTrack.stats?.plays?.toLocaleString() || 0}</span>
            <span>❤️ {currentTrack.stats?.shares || 0}</span>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="progress-section">
        <span className="time">{formatTime(currentTime)}</span>
        <div 
          className="progress-bar"
          onClick={handleSeek}
        >
          <div 
            className="progress-fill"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          ></div>
        </div>
        <span className="time">{formatTime(duration)}</span>
      </div>

      {/* 控制按钮 */}
      <div className="controls">
        <button className="control-btn">⏮️</button>
        <motion.button
          className={`main-play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </motion.button>
        <button className="control-btn">⏭️</button>
        
        <div className="volume-control">
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>

      {/* 播放列表 */}
      <div className="playlist">
        <h4>播放列表</h4>
        <AnimatePresence>
          {playlist.map((track, index) => (
            <motion.div
              key={track._id}
              className={`playlist-item ${currentTrack._id === track._id ? 'active' : ''}`}
              onClick={() => selectTrack(track)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="track-number">{index + 1}</div>
              <div className="track-details">
                <div className="track-title">{track.title}</div>
                <div className="track-date">
                  {new Date(track.releaseDate).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="track-duration">
                {formatTime(track.tracks[0]?.duration || 0)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MusicPlayer;
