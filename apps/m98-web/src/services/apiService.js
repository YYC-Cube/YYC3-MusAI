import axios from 'axios';
import API_CONFIG from './apiConfig';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 API请求:', config.url);
    return config;
  },
  (error) => {
    console.error('❌ API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API响应:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API响应错误:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// API服务方法
export const apiService = {
  // 健康检查
  health: () => apiClient.get(API_CONFIG.endpoints.health),
  
  // 获取艺术家资料
  getArtistProfile: () => apiClient.get(API_CONFIG.endpoints.artist),
  
  // 获取音乐作品
  getReleases: (page = 1, limit = 10) => 
    apiClient.get(API_CONFIG.endpoints.releases, { params: { page, limit } }),
  
  // 获取推荐音乐
  getFeaturedMusic: () => apiClient.get(API_CONFIG.endpoints.featured),
  
  // 获取粉丝墙
  getFansWall: () => apiClient.get(API_CONFIG.endpoints.fansWall),

  // 获取独家内容
  getExclusiveContent: () => apiClient.get(API_CONFIG.endpoints.exclusiveContent),

  // 获取博客文章
  getBlogPosts: () => apiClient.get(API_CONFIG.endpoints.blogPosts),

  // 获取活动
  getEvents: () => apiClient.get(API_CONFIG.endpoints.events),
  
  // 播放统计
  playTrack: (trackId, deviceId = 'web-player', location = 'Unknown') => 
    apiClient.post(API_CONFIG.endpoints.playTrack.replace(':id', trackId), {
      deviceId,
      location
    })
};

export default apiService;
