/**
 * file: adminRepository.js
 * description: 管理后台数据仓库 · 仪表盘 KPI、播放分布与最近活动聚合
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [service],[repository],[admin]
 *
 * dependencies: artistRepository, musicRepository, fanRepository
 * exports: getDashboard
 */

const artistRepository = require('./artistRepository');
const musicRepository = require('./musicRepository');
const fanRepository = require('./fanRepository');

function formatNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function playsOf(release) {
  return Number(release.stats && release.stats.plays) || 0;
}

async function getDashboard() {
  const [artist, releases, messages, messageCount] = await Promise.all([
    artistRepository.ensureArtist('M98'),
    musicRepository.listAll('M98'),
    fanRepository.listMessages(6),
    fanRepository.countMessages(),
  ]);

  const totalPlays =
    releases.reduce((sum, release) => sum + playsOf(release), 0) ||
    Number(artist.stats && artist.stats.totalPlays) ||
    0;

  const top = [...releases]
    .sort((a, b) => playsOf(b) - playsOf(a))
    .slice(0, 7)
    .reverse();

  const playTrend = top.map((release) => ({
    label:
      release.title.length > 6 ? `${release.title.slice(0, 6)}…` : release.title,
    value: playsOf(release),
  }));

  const activities = [
    ...(releases[0]
      ? [
          {
            id: `release-${releases[0].id}`,
            platform: '作品发布',
            content: `《${releases[0].title}》已上线`,
            timestamp: releases[0].releaseDate,
            likes: 0,
            comments: 0,
            type: 'release',
          },
        ]
      : []),
    ...messages.map((message) => ({
      id: `fan-${message.id}`,
      platform: '粉丝墙',
      content: message.message,
      timestamp: message.createdAt,
      likes: Number(message.likes) || 0,
      comments: 0,
      type: message.type || 'text',
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const kpis = [
    {
      id: 'plays',
      title: '总播放量',
      value: formatNumber(totalPlays),
      icon: 'play',
      hint: '全部作品累计',
    },
    {
      id: 'fans',
      title: '粉丝总量',
      value: formatNumber(Number(artist.stats && artist.stats.followers) || 0),
      icon: 'users',
      trend: 'up',
      hint: '艺人档案',
    },
    {
      id: 'releases',
      title: '作品数量',
      value: String(releases.length),
      icon: 'music',
      hint: '曲库',
    },
    {
      id: 'messages',
      title: '粉丝留言',
      value: String(messageCount),
      icon: 'interaction',
      hint: '互动墙',
    },
  ];

  return {
    kpis,
    playTrend,
    activities,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { getDashboard };
