import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

const CreationContainer = styled.div`
  background: var(--gradient-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin: var(--spacing-xl) 0;
  backdrop-filter: blur(10px);
  border: var(--border-primary);
  position: relative;
  overflow: hidden;
`;

const BackgroundPattern = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  background-image: 
    radial-gradient(circle at 25% 25%, #8A2BE2 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, #FF6B6B 2px, transparent 2px);
  background-size: 50px 50px;
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

const CreationSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
`;

const StepCard = styled(motion.div)`
  background: rgba(22, 27, 34, 0.9);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid rgba(139, 148, 158, 0.2);
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-3px);
    box-shadow: var(--shadow-card);
  }
`;

const StepNumber = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--text-lg);
  margin-bottom: var(--spacing-md);
`;

const StepTitle = styled.h3`
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
`;

const StepDescription = styled.p`
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 var(--spacing-md) 0;
`;

const StepProgress = styled.div`
  height: 6px;
  background: rgba(139, 148, 158, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: var(--gradient-primary);
  border-radius: 3px;
`;

const ProgressText = styled.div`
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-align: right;
`;

const DemoSection = styled.div`
  background: rgba(22, 27, 34, 0.6);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  border: 1px solid rgba(138, 43, 226, 0.3);
`;

const DemoTitle = styled.h3`
  color: var(--text-primary);
  font-size: var(--text-2xl);
  font-weight: 600;
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
`;

const InputOutput = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-lg);
  align-items: center;
`;

const InputSection = styled.div`
  background: rgba(13, 17, 23, 0.8);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid rgba(139, 148, 158, 0.2);
`;

const OutputSection = styled.div`
  background: rgba(13, 17, 23, 0.8);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid rgba(138, 43, 226, 0.3);
`;

const SectionLabel = styled.div`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
`;

const ContentText = styled.div`
  color: var(--text-primary);
  line-height: 1.6;
  font-family: 'Courier New', monospace;
  
  .highlight {
    background: rgba(138, 43, 226, 0.2);
    padding: 2px 4px;
    border-radius: 3px;
    color: var(--primary-purple);
  }
`;

const TransformIcon = styled(motion.div)`
  background: var(--gradient-primary);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  color: white;
`;

const ToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-xl);
`;

const ToolCard = styled(motion.div)`
  background: rgba(22, 27, 34, 0.8);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  border: 1px solid rgba(139, 148, 158, 0.2);
  text-align: center;
  transition: var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-purple);
    transform: translateY(-2px);
  }
`;

const ToolIcon = styled.div`
  font-size: var(--text-4xl);
  margin-bottom: var(--spacing-sm);
`;

const ToolName = styled.h4`
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0 0 var(--spacing-xs) 0;
`;

const ToolDescription = styled.p`
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0;
  line-height: 1.4;
`;

const AICreationShowcase = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [demo, setDemo] = useState({
    input: '月下独酌，古筝轻吟',
    output: '',
    isProcessing: false
  });

  const creationSteps = [
    {
      title: '情感输入',
      description: '董小姐将诗词、情感、或生活感悟输入AI系统，让机器理解人文情怀。',
      progress: 100,
      tools: ['自然语言处理', '情感分析', '文化语境理解']
    },
    {
      title: 'AI音乐生成',
      description: 'AI基于输入的情感和董小姐的音乐风格，生成旋律、和声、节奏框架。',
      progress: 85,
      tools: ['神经网络作曲', '风格迁移', '旋律生成']
    },
    {
      title: '人工精修',
      description: '董小姐对AI生成的音乐进行精心调整，融入个人情感和艺术理念。',
      progress: 70,
      tools: ['专业编曲', '情感注入', '细节打磨']
    },
    {
      title: '最终呈现',
      description: '将传统与现代、人工与智能完美融合，创造出独特的音乐作品。',
      progress: 60,
      tools: ['混音制作', '后期处理', '音频优化']
    }
  ];

  const aiTools = [
    {
      icon: '🧠',
      name: 'NeuroComposer',
      description: '深度学习音乐创作引擎，专门训练于东方古典音乐'
    },
    {
      icon: '🎼',
      name: 'HarmonyAI',
      description: '智能和声分析与生成，融合现代电子音乐理论'
    },
    {
      icon: '🎵',
      name: 'MelodyMind',
      description: '旋律创作助手，善于将情感转化为音符'
    },
    {
      icon: '🎛️',
      name: 'SoundFusion',
      description: '音频融合处理器，完美平衡传统与现代音色'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % creationSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (demo.isProcessing) {
      const outputs = [
        '生成中...',
        '分析情感基调: 宁静、思索...',
        '匹配音乐风格: 古典电子融合...',
        '创建旋律框架: Em - Am - F - C...',
        '添加东方音色: 古筝、埙、电子合成...',
        '完成创作: 《月下独酌》- 一首融合古典诗意与现代电子的作品'
      ];
      
      let index = 0;
      const outputInterval = setInterval(() => {
        setDemo(prev => ({ ...prev, output: outputs[index] }));
        index++;
        if (index >= outputs.length) {
          clearInterval(outputInterval);
          setDemo(prev => ({ ...prev, isProcessing: false }));
        }
      }, 1000);
      
      return () => clearInterval(outputInterval);
    }
  }, [demo.isProcessing]);

  const handleDemoStart = () => {
    setDemo(prev => ({ ...prev, output: '', isProcessing: true }));
  };

  return (
    <CreationContainer>
      <BackgroundPattern />
      <ContentWrapper>
        <SectionTitle>AI音乐创作工坊</SectionTitle>
        
        <CreationSteps>
          {creationSteps.map((step, index) => (
            <StepCard
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              style={{
                border: index === currentStep ? '2px solid #8A2BE2' : '1px solid rgba(139, 148, 158, 0.2)'
              }}
            >
              <StepNumber>{index + 1}</StepNumber>
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
              <StepProgress>
                <ProgressFill
                  animate={{ width: `${step.progress}%` }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                />
              </StepProgress>
              <ProgressText>{step.progress}% 完成</ProgressText>
            </StepCard>
          ))}
        </CreationSteps>

        <DemoSection>
          <DemoTitle>🎼 实时创作演示</DemoTitle>
          <InputOutput>
            <InputSection>
              <SectionLabel>📝 灵感输入</SectionLabel>
              <ContentText>
                <div className="highlight">{demo.input}</div>
                <br />
                <small>- 一个宁静的夜晚，古代诗人的情怀</small>
              </ContentText>
            </InputSection>
            
            <TransformIcon
              animate={{ rotate: demo.isProcessing ? 360 : 0 }}
              transition={{ duration: 2, repeat: demo.isProcessing ? Infinity : 0 }}
              whileHover={{ scale: 1.1 }}
              onClick={handleDemoStart}
              style={{ cursor: 'pointer' }}
            >
              ⚡
            </TransformIcon>
            
            <OutputSection>
              <SectionLabel>🎵 AI音乐输出</SectionLabel>
              <ContentText>
                {demo.output || '点击中间的闪电图标开始创作...'}
              </ContentText>
            </OutputSection>
          </InputOutput>
        </DemoSection>

        <ToolsGrid>
          {aiTools.map((tool, index) => (
            <ToolCard
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <ToolIcon>{tool.icon}</ToolIcon>
              <ToolName>{tool.name}</ToolName>
              <ToolDescription>{tool.description}</ToolDescription>
            </ToolCard>
          ))}
        </ToolsGrid>
      </ContentWrapper>
    </CreationContainer>
  );
};

export default AICreationShowcase;
