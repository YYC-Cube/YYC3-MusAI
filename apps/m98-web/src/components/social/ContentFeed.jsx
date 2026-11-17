import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import apiService from '../../services/apiService';
import { resolvePoster } from '../../config/assets';

const STATUS_LABELS = {
  upcoming: '即将开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消'
};

const ContentFeed = () => {
  const [blogPosts, setBlogPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [blogResponse, eventResponse] = await Promise.all([
        apiService.getBlogPosts(),
        apiService.getEvents()
      ]);
      setBlogPosts(blogResponse.data.data || []);
      setEvents(eventResponse.data.data || []);
    } catch (err) {
      console.error('内容加载失败:', err);
      setError('内容加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <ContentFeedContainer>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        手记与现场 <span className="subtitle">Journal & Events</span>
      </motion.h2>

      <p className="feed-description">
        创作手记、制作细节与线下活动，都在这里持续更新。
      </p>

      {loading && <div className="content-status">正在加载内容…</div>}
      {error && (
        <div className="content-status error">
          <span>{error}</span>
          <button type="button" onClick={fetchContent}>重试</button>
        </div>
      )}

      {!loading && !error && (
        <div className="feed-grid">
          <section className="feed-column">
            <div className="column-head">
              <h3>音乐手记</h3>
              <span>{blogPosts.length} 篇</span>
            </div>

            {blogPosts.length === 0 && <div className="empty">暂无手记</div>}

            {blogPosts.map((post, index) => (
              <motion.article
                key={post.id}
                className="blog-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <img
                  src={post.coverImage || resolvePoster(index)}
                  alt={post.title}
                  onError={(e) => {
                    e.target.src = resolvePoster(index);
                  }}
                />
                <div className="card-body">
                  <p className="meta">
                    {post.publishDate}
                    {post.readTime ? ` · ${post.readTime} 分钟` : ''}
                  </p>
                  <h4>{post.title}</h4>
                  <p className="excerpt">{post.excerpt}</p>
                  <div className="tags">
                    {(post.tags || []).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.article>
            ))}
          </section>

          <section className="feed-column">
            <div className="column-head">
              <h3>活动日程</h3>
              <span>{events.length} 场</span>
            </div>

            {events.length === 0 && <div className="empty">暂无活动</div>}

            {events.map((event, index) => (
              <motion.article
                key={event.id}
                className="event-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <img
                  src={event.image || resolvePoster(index + 2)}
                  alt={event.title}
                  onError={(e) => {
                    e.target.src = resolvePoster(index + 2);
                  }}
                />
                <div className="card-body">
                  <div className="event-topline">
                    <span className="date">{event.date}</span>
                    <span className={`status ${event.status}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                  <h4>{event.title}</h4>
                  <p className="excerpt">{event.description}</p>
                  <div className="event-meta">
                    <span>{event.location}</span>
                    <strong>{event.ticketPrice}</strong>
                  </div>
                </div>
              </motion.article>
            ))}
          </section>
        </div>
      )}
    </ContentFeedContainer>
  );
};

const ContentFeedContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1300px;
  margin: 0 auto;

  h2 {
    font-size: 2.6rem;
    text-align: center;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, #8a2be2, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    .subtitle {
      display: block;
      font-size: 0.95rem;
      font-weight: 300;
      color: #b8bcc8;
      margin-top: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      -webkit-text-fill-color: #b8bcc8;
    }
  }

  .feed-description {
    text-align: center;
    color: #b8bcc8;
    margin: 0 auto 3rem;
    max-width: 620px;
    line-height: 1.7;
  }

  .content-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 1rem;
    color: #b8bcc8;

    &.error {
      color: #ff6b6b;
    }

    button {
      background: rgba(138, 43, 226, 0.16);
      border: 1px solid rgba(138, 43, 226, 0.35);
      color: #e6edf3;
      border-radius: 999px;
      padding: 0.6rem 1.4rem;
      cursor: pointer;
    }
  }

  .feed-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
  }

  .feed-column {
    background: rgba(22, 27, 34, 0.55);
    border: 1px solid rgba(138, 43, 226, 0.16);
    border-radius: 20px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    backdrop-filter: blur(10px);
  }

  .column-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    h3 {
      margin: 0;
      color: #e6edf3;
      font-size: 1.2rem;
    }

    span {
      color: #8b949e;
      font-size: 0.8rem;
    }
  }

  .blog-card,
  .event-card {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 1rem;
    padding: 0.75rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    transition: border-color 0.25s ease, background 0.25s ease;

    &:hover {
      border-color: rgba(138, 43, 226, 0.32);
      background: rgba(138, 43, 226, 0.06);
    }

    img {
      width: 100%;
      height: 100%;
      min-height: 96px;
      object-fit: cover;
      border-radius: 10px;
    }

    .card-body {
      min-width: 0;
    }

    h4 {
      margin: 0.35rem 0 0.5rem;
      color: #e6edf3;
      font-size: 1rem;
      line-height: 1.45;
    }

    .meta,
    .date {
      margin: 0;
      color: #8b949e;
      font-size: 0.74rem;
    }

    .excerpt {
      margin: 0 0 0.6rem;
      color: #b8bcc8;
      font-size: 0.82rem;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;

      span {
        padding: 0.18rem 0.55rem;
        border-radius: 999px;
        font-size: 0.68rem;
        color: #ff9b9b;
        background: rgba(255, 107, 107, 0.14);
      }
    }

    .event-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .status {
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      font-size: 0.66rem;
      color: #d9c2ff;
      background: rgba(138, 43, 226, 0.18);
    }

    .status.ended,
    .status.cancelled {
      color: #8b949e;
      background: rgba(139, 148, 158, 0.14);
    }

    .event-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      color: #8b949e;
      font-size: 0.76rem;

      strong {
        color: #ff9b9b;
        font-weight: 600;
      }
    }
  }

  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: #8b949e;
    font-size: 0.85rem;
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  @media (max-width: 900px) {
    padding: 4rem 1.25rem;

    .feed-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .blog-card,
    .event-card {
      grid-template-columns: 1fr;

      img {
        height: 160px;
      }
    }
  }
`;

export default ContentFeed;
