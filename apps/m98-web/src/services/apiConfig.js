// M98 API服务配置
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  endpoints: {
    health: '/health',
    artist: '/api/artist/profile',
    releases: '/api/music/releases',
    featured: '/api/music/featured',
    fansWall: '/api/fans/wall',
    exclusiveContent: '/api/content/exclusive',
    blogPosts: '/api/content/blog',
    events: '/api/content/events',
    playTrack: '/api/music/:id/play'
  }
};

export default API_CONFIG;
