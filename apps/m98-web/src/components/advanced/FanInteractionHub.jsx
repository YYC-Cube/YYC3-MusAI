import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import apiService from '../../services/apiService';

const InteractionContainer = styled.div`
  background: var(--gradient-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  backdrop-filter: blur(10px);
  border: var(--border-primary);
  margin: var(--spacing-xl) 0;
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

const FeedbackForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
`;

const Label = styled.label`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid rgba(139, 148, 158, 0.3);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-purple);
    box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.1);
  }
  
  &::placeholder {
    color: var(--text-muted);
  }
`;

const TextArea = styled.textarea`
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid rgba(139, 148, 158, 0.3);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--text-base);
  font-family: inherit;
  min-height: 120px;
  resize: vertical;
  transition: var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-purple);
    box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.1);
  }
  
  &::placeholder {
    color: var(--text-muted);
  }
`;

const SubmitButton = styled(motion.button)`
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
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

const EmotionSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin: var(--spacing-md) 0;
`;

const EmotionButton = styled(motion.button)`
  background: ${props => props.selected ? 'var(--gradient-primary)' : 'rgba(22, 27, 34, 0.8)'};
  color: ${props => props.selected ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.selected ? 'transparent' : 'rgba(139, 148, 158, 0.3)'};
  border-radius: var(--radius-full);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  
  &:hover {
    transform: translateY(-1px);
    background: ${props => props.selected ? 'var(--gradient-primary)' : 'rgba(138, 43, 226, 0.1)'};
  }
`;

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

const FeedbackItem = styled(motion.div)`
  background: rgba(22, 27, 34, 0.6);
  border: 1px solid rgba(139, 148, 158, 0.2);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-1px);
  }
`;

const FeedbackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
`;

const FeedbackMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
`;

const FeedbackContent = styled.p`
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
`;

const EmotionTag = styled.span`
  background: var(--gradient-primary);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
`;

const StatusMessage = styled(motion.div)`
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  margin: var(--spacing-sm) 0;
  text-align: center;
  font-size: var(--text-sm);
  
  &.success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const emotions = [
  { id: 'excited', label: '兴奋', emoji: '🎉' },
  { id: 'peaceful', label: '平静', emoji: '🧘' },
  { id: 'nostalgic', label: '怀念', emoji: '💭' },
  { id: 'energetic', label: '活力', emoji: '⚡' },
  { id: 'dreamy', label: '梦幻', emoji: '🌟' },
  { id: 'emotional', label: '感动', emoji: '💝' },
  { id: 'inspired', label: '启发', emoji: '💡' },
  { id: 'relaxed', label: '放松', emoji: '🌸' }
];

const FanInteractionHub = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    emotion: '',
    favoriteTrack: ''
  });
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    loadFeedbacks();
    loadTracks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const response = await apiService.getFanMessages();
      setFeedbacks(response.data || []);
    } catch (error) {
      console.error('加载反馈失败:', error);
    }
  };

  const loadTracks = async () => {
    try {
      const response = await apiService.getLatestReleases();
      setTracks(response.data || []);
    } catch (error) {
      console.error('加载音乐列表失败:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmotionToggle = (emotionId) => {
    setSelectedEmotions(prev => 
      prev.includes(emotionId) 
        ? prev.filter(id => id !== emotionId)
        : [...prev, emotionId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const feedbackData = {
        ...formData,
        emotions: selectedEmotions,
        timestamp: new Date().toISOString()
      };

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatusMessage({ 
        type: 'success', 
        text: '感谢您的反馈！您的声音对董小姐很重要 💖' 
      });
      
      // 重置表单
      setFormData({
        name: '',
        email: '',
        message: '',
        emotion: '',
        favoriteTrack: ''
      });
      setSelectedEmotions([]);
      
      // 重新加载反馈
      setTimeout(loadFeedbacks, 1000);
      
    } catch (error) {
      setStatusMessage({ 
        type: 'error', 
        text: '提交失败，请稍后重试' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <InteractionContainer>
      <SectionTitle>与董小姐的音乐共鸣</SectionTitle>
      
      <FeedbackForm onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">您的昵称</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="请输入您的昵称"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">联系邮箱（可选）</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="favoriteTrack">最喜欢的作品</Label>
          <Input
            id="favoriteTrack"
            name="favoriteTrack"
            type="text"
            value={formData.favoriteTrack}
            onChange={handleInputChange}
            placeholder="请输入您最喜欢的董小姐作品"
          />
        </FormGroup>

        <FormGroup>
          <Label>音乐给您的感受</Label>
          <EmotionSelector>
            {emotions.map(emotion => (
              <EmotionButton
                key={emotion.id}
                type="button"
                selected={selectedEmotions.includes(emotion.id)}
                onClick={() => handleEmotionToggle(emotion.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {emotion.emoji} {emotion.label}
              </EmotionButton>
            ))}
          </EmotionSelector>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="message">您想对董小姐说的话</Label>
          <TextArea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="分享您听董小姐音乐时的感受，或者想对她说的话..."
            required
          />
        </FormGroup>

        <AnimatePresence>
          {statusMessage.text && (
            <StatusMessage
              className={statusMessage.type}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {statusMessage.text}
            </StatusMessage>
          )}
        </AnimatePresence>

        <SubmitButton
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? '发送中...' : '发送反馈 💌'}
        </SubmitButton>
      </FeedbackForm>

      <FeedbackList>
        <h3 style={{ 
          color: 'var(--text-primary)', 
          marginBottom: 'var(--spacing-md)',
          fontSize: 'var(--text-xl)'
        }}>
          粉丝心声 💭
        </h3>
        
        {feedbacks.map((feedback, index) => (
          <FeedbackItem
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <FeedbackHeader>
              <FeedbackMeta>
                <span>📝 {feedback.name || '匿名粉丝'}</span>
                <span>•</span>
                <span>{formatDate(feedback.timestamp || new Date())}</span>
              </FeedbackMeta>
              {feedback.emotion && (
                <EmotionTag>{feedback.emotion}</EmotionTag>
              )}
            </FeedbackHeader>
            <FeedbackContent>{feedback.message}</FeedbackContent>
          </FeedbackItem>
        ))}
        
        {feedbacks.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            padding: 'var(--spacing-xl)'
          }}>
            还没有反馈，成为第一个分享心声的粉丝吧！ 🌟
          </div>
        )}
      </FeedbackList>
    </InteractionContainer>
  );
};

export default FanInteractionHub;
