import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { resolveCover } from '../../config/assets';

const FanWall = ({ fansWall }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [likedMessages, setLikedMessages] = useState(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);

  const handleLike = (messageId) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleSubmitMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // 这里可以集成API提交留言
      console.log('提交留言:', newMessage);
      setNewMessage('');
      setShowMessageForm(false);
    }
  };

  if (!fansWall || fansWall.length === 0) {
    return (
      <FanWallContainer>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          粉丝心声
        </motion.h2>
        <EmptyState>
          <p>还没有粉丝留言，成为第一个留言的人吧！</p>
          <motion.button
            className="first-message-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMessageForm(true)}
          >
            写下第一条留言
          </motion.button>
        </EmptyState>
      </FanWallContainer>
    );
  }

  return (
    <FanWallContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        粉丝心声 <span className="subtitle">Fan Messages</span>
      </motion.h2>
      
      <div className="fan-wall-header">
        <p className="wall-description">
          听众们用心灵与音乐对话，在这里分享他们的感动与思考
        </p>
        <motion.button
          className="add-message-btn"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMessageForm(true)}
        >
          + 留下你的声音
        </motion.button>
      </div>

      {/* 留言表单 */}
      <AnimatePresence>
        {showMessageForm && (
          <motion.div
            className="message-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMessageForm(false)}
          >
            <motion.form
              className="message-form"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmitMessage}
            >
              <h3>分享你的感受</h3>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="董小姐的音乐给你带来了什么感受？在这里分享你的想法..."
                maxLength={200}
                autoFocus
              />
              <div className="form-actions">
                <button type="button" onClick={() => setShowMessageForm(false)}>
                  取消
                </button>
                <button type="submit" disabled={!newMessage.trim()}>
                  发布留言
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="fan-messages">
        {fansWall.map((message, index) => (
          <motion.div
            key={message.id}
            className="fan-message"
            initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => setSelectedMessage(message)}
          >
            <div className="message-header">
              <div className="user-avatar">
                <img 
                  src={resolveCover(index)} 
                  alt={message.username}
                  onError={(e) => {
                    e.target.src = resolveCover(0);
                  }}
                />
                <div className="online-indicator"></div>
              </div>
              <div className="user-info">
                <h4>{message.username}</h4>
                <span className="user-badge">音乐爱好者</span>
                <span className="timestamp">
                  {formatRelativeTime(message.createdAt)}
                </span>
              </div>
            </div>
            
            <motion.p 
              className="message-text"
              initial={{ opacity: 0.8 }}
              whileHover={{ opacity: 1 }}
            >
              {message.message}
            </motion.p>
            
            <div className="message-footer">
              <motion.button
                className={`like-btn ${likedMessages.has(message.id) ? 'liked' : ''}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(message.id);
                }}
              >
                <span className="heart">❤️</span>
                <span className="like-count">
                  {message.likes + (likedMessages.has(message.id) ? 1 : 0)}
                </span>
              </motion.button>
              
              <div className="message-actions">
                <motion.button
                  className="reply-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  💬 回复
                </motion.button>
                <motion.button
                  className="share-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  📤 分享
                </motion.button>
              </div>
            </div>
            
            {/* 音乐波纹效果 */}
            <div className="message-waves">
              <div className="wave wave-1"></div>
              <div className="wave wave-2"></div>
              <div className="wave wave-3"></div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 更多留言按钮 */}
      <motion.div
        className="load-more"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <motion.button
          className="load-more-btn"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          查看更多心声 ↓
        </motion.button>
      </motion.div>

      {/* 留言详情模态框 */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            className="message-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              className="message-modal"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <img src={selectedMessage.avatar} alt={selectedMessage.username} />
                <div>
                  <h3>{selectedMessage.username}</h3>
                  <p>{formatRelativeTime(selectedMessage.createdAt)}</p>
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedMessage(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-content">
                <p>{selectedMessage.message}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FanWallContainer>
  );
};

// 工具函数
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffInMinutes < 1) return '刚刚';
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
  if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}天前`;
  
  return time.toLocaleDateString('zh-CN');
};

// Styled Components
const FanWallContainer = styled.section`
  padding: 6rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(180deg, transparent 0%, rgba(255, 107, 107, 0.05) 50%, transparent 100%);
  
  h2 {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 2rem;
    background: linear-gradient(45deg, #FF6B6B, #8A2BE2);
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
      background: linear-gradient(90deg, #FF6B6B, #8A2BE2);
      border-radius: 1px;
    }
  }
  
  .fan-wall-header {
    text-align: center;
    margin-bottom: 4rem;
    
    .wall-description {
      color: #B8BCC8;
      font-size: 1.1rem;
      margin-bottom: 2rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }
    
    .add-message-btn {
      background: linear-gradient(45deg, #FF6B6B, #8A2BE2);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 30px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
      }
    }
  }
  
  .fan-messages {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-bottom: 4rem;
    
    .fan-message {
      background: rgba(22, 27, 34, 0.6);
      border-radius: 20px;
      padding: 2rem;
      border: 1px solid rgba(255, 107, 107, 0.1);
      cursor: pointer;
      transition: all 0.4s ease;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      
      &:hover {
        border-color: #FF6B6B;
        box-shadow: 
          0 15px 35px rgba(255, 107, 107, 0.15),
          0 0 0 1px rgba(255, 107, 107, 0.1);
        
        .message-waves .wave {
          animation-play-state: running;
        }
      }
      
      .message-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        
        .user-avatar {
          position: relative;
          
          img {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #FF6B6B;
          }
          
          .online-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #00D26A;
            border-radius: 50%;
            border: 2px solid rgba(22, 27, 34, 0.8);
          }
        }
        
        .user-info {
          flex: 1;
          
          h4 {
            margin: 0;
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
          }
          
          .user-badge {
            display: inline-block;
            background: rgba(255, 107, 107, 0.2);
            color: #FF6B6B;
            padding: 0.25rem 0.75rem;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 500;
            margin: 0.25rem 0;
          }
          
          .timestamp {
            display: block;
            font-size: 0.85rem;
            color: #8B949E;
            margin-top: 0.25rem;
          }
        }
      }
      
      .message-text {
        margin-bottom: 1.5rem;
        line-height: 1.7;
        color: #E6EDF3;
        font-size: 1rem;
        position: relative;
        z-index: 2;
      }
      
      .message-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .like-btn {
          background: none;
          border: none;
          color: #FF6B6B;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          transition: all 0.3s ease;
          
          &:hover {
            background: rgba(255, 107, 107, 0.1);
          }
          
          &.liked {
            .heart {
              animation: heartBeat 0.6s ease-out;
            }
          }
          
          .heart {
            font-size: 1.2rem;
          }
        }
        
        .message-actions {
          display: flex;
          gap: 1rem;
          
          button {
            background: none;
            border: none;
            color: #8B949E;
            cursor: pointer;
            font-size: 0.85rem;
            padding: 0.5rem;
            border-radius: 10px;
            transition: all 0.3s ease;
            
            &:hover {
              color: white;
              background: rgba(255, 255, 255, 0.1);
            }
          }
        }
      }
      
      .message-waves {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 60px;
        overflow: hidden;
        pointer-events: none;
        
        .wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 107, 107, 0.1) 50%, 
            transparent 100%);
          animation: wave 3s linear infinite;
          animation-play-state: paused;
          
          &.wave-1 {
            animation-duration: 3s;
            opacity: 0.3;
          }
          
          &.wave-2 {
            animation-duration: 4s;
            animation-delay: -1s;
            opacity: 0.2;
          }
          
          &.wave-3 {
            animation-duration: 5s;
            animation-delay: -2s;
            opacity: 0.1;
          }
        }
      }
    }
  }
  
  .load-more {
    text-align: center;
    
    .load-more-btn {
      background: transparent;
      border: 2px solid #FF6B6B;
      color: #FF6B6B;
      padding: 1rem 2rem;
      border-radius: 30px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #FF6B6B;
        color: white;
        box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
      }
    }
  }
  
  /* 模态框样式 */
  .message-form-overlay,
  .message-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }
  
  .message-form {
    background: rgba(22, 27, 34, 0.95);
    border-radius: 20px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    border: 1px solid rgba(255, 107, 107, 0.3);
    
    h3 {
      margin: 0 0 1rem 0;
      color: white;
      text-align: center;
    }
    
    textarea {
      width: 100%;
      min-height: 120px;
      background: rgba(13, 17, 23, 0.8);
      border: 1px solid rgba(255, 107, 107, 0.3);
      border-radius: 10px;
      padding: 1rem;
      color: white;
      font-size: 1rem;
      resize: vertical;
      margin-bottom: 1rem;
      
      &:focus {
        outline: none;
        border-color: #FF6B6B;
      }
      
      &::placeholder {
        color: #8B949E;
      }
    }
    
    .form-actions {
      display: flex;
      gap: 1rem;
      
      button {
        flex: 1;
        padding: 0.75rem;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        
        &[type="button"] {
          background: rgba(139, 148, 158, 0.2);
          color: #8B949E;
        }
        
        &[type="submit"] {
          background: linear-gradient(45deg, #FF6B6B, #8A2BE2);
          color: white;
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }
  
  .message-modal {
    background: rgba(22, 27, 34, 0.95);
    border-radius: 20px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    border: 1px solid rgba(255, 107, 107, 0.3);
    
    .modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      
      img {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
      }
      
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
      color: #E6EDF3;
      line-height: 1.7;
      font-size: 1.1rem;
    }
  }

  @keyframes wave {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(0%); }
  }
  
  @keyframes heartBeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.2); }
    50% { transform: scale(1.1); }
    75% { transform: scale(1.15); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #B8BCC8;
  
  p {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  .first-message-btn {
    background: linear-gradient(45deg, #FF6B6B, #8A2BE2);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
    }
  }
`;

export default FanWall;
