import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import ASSETS from '../../config/assets';

const PlayerContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, rgba(13, 17, 23, 0.9) 0%, rgba(13, 17, 23, 0.98) 100%);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(138, 43, 226, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  transition: transform 0.3s ease;
  transform: ${props => props.isVisible ? 'translateY(0)' : 'translateY(100%)'};
`;

const TrackInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
`;

const CoverArt = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 10px;
  background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1));
    pointer-events: none;
  }
`;

const TrackDetails = styled.div`
  flex: 1;
  min-width: 0;
  
  h4 {
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 5px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const PlayerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const ControlButton = styled(motion.button)`
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  font-size: ${props => props.primary ? '24px' : '20px'};
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(138, 43, 226, 0.2);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ProgressSection = styled.div`
  flex: 1;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: rgba(139, 148, 158, 0.3);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  
  &:hover {
    transform: scaleY(1.2);
  }
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #8A2BE2, #FF6B6B);
  border-radius: 3px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  ${ProgressBar}:hover &::after {
    opacity: 1;
  }
`;

const TimeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 120px;
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: rgba(139, 148, 158, 0.3);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: linear-gradient(45deg, #8A2BE2, #FF6B6B);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
`;

const AdvancedMusicPlayer = ({ 
  currentTrack, 
  playlist = [], 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious,
  onTrackChange,
  onVolumeChange,
  onProgressChange 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('音频播放失败:', err.message);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleLoadedMetadata = (e) => {
    setDuration(Number.isFinite(e.target.duration) ? e.target.duration : 0);
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleEnded = () => {
    onNext?.();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onProgressChange?.(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <PlayerContainer
          as={motion.div}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          isVisible={isVisible}
        >
          <audio
            ref={audioRef}
            src={currentTrack.streamUrl}
            preload="metadata"
            style={{ display: 'none' }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
          <TrackInfo>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <CoverArt>
                <img 
                  src={currentTrack.coverArt || ASSETS.brand.logo} 
                  alt={currentTrack.title}
                />
              </CoverArt>
            </motion.div>
            
            <TrackDetails>
              <h4>{currentTrack.title}</h4>
              <p>董小姐 M98 • {currentTrack.genre || '电子融合'}</p>
            </TrackDetails>
          </TrackInfo>

          <PlayerControls>
            <ControlButton
              onClick={onPrevious}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ⏮
            </ControlButton>
            
            <ControlButton
              primary
              onClick={onPlayPause}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? '⏸' : '▶'}
            </ControlButton>
            
            <ControlButton
              onClick={onNext}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ⏭
            </ControlButton>
          </PlayerControls>

          <ProgressSection>
            <ProgressBar onClick={handleProgressClick}>
              <ProgressFill
                animate={{ width: `${(currentTime / duration) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </ProgressBar>
            <TimeDisplay>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </TimeDisplay>
          </ProgressSection>

          <VolumeControl>
            <span style={{ fontSize: '16px' }}>🔊</span>
            <VolumeSlider
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
            />
          </VolumeControl>
        </PlayerContainer>
      )}
    </AnimatePresence>
  );
};

export default AdvancedMusicPlayer;
