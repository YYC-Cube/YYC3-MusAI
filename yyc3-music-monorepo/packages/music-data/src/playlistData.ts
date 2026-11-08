import type { Emotion } from '@yyc3/music-hooks';

// 使用本地图片资源
const dMusicLogo = '/assets/dmusic-logo.png';
const dMusicGold = '/assets/dmusic-gold.png';
const dMusicInstruments = '/assets/dmusic-instruments.png';
const dMusicRed = '/assets/dmusic-red.png';
const artistWarm = '/assets/artist-warm.png';
const artistBlue = '/assets/artist-blue.png';

// ==========================================
// Brand Assets (re-exported for other components)
// ==========================================
export { dMusicLogo, dMusicGold, dMusicInstruments, dMusicRed, artistWarm, artistBlue };

// ==========================================
// Track & Playlist Types
// ==========================================
export interface LyricLine {
  time: number;
  text: string;
  translation?: string;
  emotion?: Emotion;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds (used as fallback for demo mode)
  albumArt: string;
  audioUrl?: string; // If provided, plays real audio. Otherwise, demo oscillator mode.
  videoUrl?: string; // If provided, plays video in video mode.
  lyrics: LyricLine[];
  chordSet: number; // Which chord progression set for demo mode
  color: string; // Theme color for the track
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  category: 'listening' | 'social' | 'collection' | 'streak';
}

export interface UserProfileData {
  userId: string;
  email: string;
  displayName: string;
  starPower: number;
  totalListeningTime: number;
  totalAnnotations: number;
  totalLikes: number;
  achievements: string[];
  joinedAt: string;
  streak: number;
}

export interface CommunityActivity {
  id: string;
  type: 'annotation' | 'like' | 'achievement' | 'play';
  userId: string;
  userName: string;
  songId: string;
  songTitle: string;
  detail: string;
  timestamp: number;
}

// ==========================================
// Achievement Definitions
// ==========================================
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', name: 'First Note', icon: '🎵', description: 'Played your first track', requirement: 1, category: 'listening' },
  { id: 'listener_10', name: 'Dedicated Ear', icon: '🎧', description: 'Listened to 10 minutes of music', requirement: 600, category: 'listening' },
  { id: 'listener_60', name: 'Marathon Listener', icon: '🏆', description: 'Listened to 60 minutes of music', requirement: 3600, category: 'listening' },
  { id: 'annotator_5', name: 'Emotion Reader', icon: '💫', description: 'Made 5 emotion annotations', requirement: 5, category: 'social' },
  { id: 'annotator_25', name: 'Empathy Master', icon: '🌈', description: 'Made 25 emotion annotations', requirement: 25, category: 'social' },
  { id: 'liker_10', name: 'Heart Giver', icon: '💖', description: 'Liked 10 times', requirement: 10, category: 'social' },
  { id: 'star_500', name: 'Star Collector', icon: '⭐', description: 'Earned 500 star power', requirement: 500, category: 'collection' },
  { id: 'star_1000', name: 'Constellation', icon: '🌟', description: 'Earned 1000 star power', requirement: 1000, category: 'collection' },
  { id: 'streak_3', name: 'Three Day Streak', icon: '🔥', description: 'Listened 3 days in a row', requirement: 3, category: 'streak' },
  { id: 'streak_7', name: 'Weekly Warrior', icon: '💎', description: 'Listened 7 days in a row', requirement: 7, category: 'streak' },
  { id: 'explorer', name: 'Explorer', icon: '🚀', description: 'Played 5 different tracks', requirement: 5, category: 'collection' },
  { id: 'custom_track', name: 'DJ Mode', icon: '🎛️', description: 'Added a custom audio file', requirement: 1, category: 'collection' },
];

// ==========================================
// Demo Playlist Data
// ==========================================
export const DEMO_PLAYLIST: Track[] = [
  {
    id: 'track-1',
    title: 'Cosmic Dreams',
    artist: 'Stellar Dust',
    album: 'Nebula',
    duration: 180,
    albumArt: artistBlue,
    videoUrl: '/mv/mv-3:4/Music-1990.mp4',
    chordSet: 0,
    color: '#667eea',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u524D\u594F', emotion: 'neutral' },
      { time: 6, text: 'Wait for the stars to align', translation: '\u7B49\u5F85\u661F\u8FB0\u5BF9\u9F50', emotion: 'neutral' },
      { time: 14, text: 'Drifting through the endless night', translation: '\u6F02\u6D41\u5728\u65E0\u5C3D\u7684\u591C', emotion: 'calm' },
      { time: 22, text: 'Can you hear the cosmic song?', translation: '\u4F60\u80FD\u542C\u5230\u5B87\u5B99\u4E4B\u6B4C\u5417\uFF1F', emotion: 'calm' },
      { time: 30, text: "It's calling us back home", translation: '\u547C\u5524\u6211\u4EEC\u5F52\u5BB6', emotion: 'happy' },
      { time: 40, text: 'We are stardust, we are golden', translation: '\u6211\u4EEC\u662F\u661F\u5C18\uFF0C\u6211\u4EEC\u662F\u91D1\u5B50', emotion: 'happy' },
      { time: 50, text: "Caught in the devil's bargain", translation: '\u56F0\u4E8E\u9B54\u9B3C\u7684\u4EA4\u6613', emotion: 'sad' },
      { time: 60, text: "And we've got to get ourselves back to the garden", translation: '\u6211\u4EEC\u5FC5\u987B\u56DE\u5230\u4F0A\u7538\u56ED', emotion: 'energetic' },
      { time: 72, text: 'Far away across the universe', translation: '\u7A7F\u8D8A\u5B87\u5B99\u7684\u5F7C\u7AEF', emotion: 'neutral' },
      { time: 82, text: 'Images of broken light', translation: '\u7834\u788E\u5149\u5F71\u7684\u56FE\u50CF', emotion: 'sad' },
      { time: 92, text: 'Dance before me like a million eyes', translation: '\u5728\u6211\u9762\u524D\u524D\u5982\u4E07\u5343\u773C\u7738\u822C\u821E\u52A8', emotion: 'energetic' },
      { time: 104, text: 'They call me on and on across the universe', translation: '\u5B83\u4EEC\u547C\u5524\u6211\u7A7F\u8D8A\u5B87\u5B99', emotion: 'happy' },
      { time: 116, text: "Nothing's gonna change my world", translation: '\u4EC0\u4E48\u4E5F\u6539\u53D8\u4E0D\u4E86\u6211\u7684\u4E16\u754C', emotion: 'calm' },
      { time: 126, text: 'Sounds of laughter, shades of life', translation: '\u7B11\u58F0\u4E0E\u4EBA\u751F\u7684\u5149\u5F71', emotion: 'happy' },
      { time: 136, text: 'Are ringing through my opened mind', translation: '\u5728\u6211\u655E\u5F00\u7684\u5FC3\u4E2D\u56DE\u54CD', emotion: 'energetic' },
      { time: 146, text: 'Inciting and inviting me', translation: '\u6FC0\u52B1\u548C\u9080\u8BF7\u7740\u6211', emotion: 'energetic' },
      { time: 156, text: 'Limitless, undying love', translation: '\u65E0\u9650\u7684\uFF0C\u4E0D\u673D\u7684\u7231', emotion: 'happy' },
      { time: 166, text: 'Which shines around me like a million suns', translation: '\u50CF\u767E\u4E07\u592A\u9633\u822C\u7167\u8000\u6211', emotion: 'energetic' },
      { time: 176, text: 'And calls me on across the universe', translation: '\u547C\u5524\u6211\u7A7F\u8D8A\u5B87\u5B99', emotion: 'calm' },
    ],
  },
  {
    id: 'track-2',
    title: 'Neon Horizon',
    artist: 'Circuit Wave',
    album: 'Digital Pulse',
    duration: 210,
    albumArt: artistWarm,
    videoUrl: '/mv/mv-4:3/Music-1989.mp4',
    chordSet: 1,
    color: '#ff4500',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u5F15\u5B50', emotion: 'neutral' },
      { time: 8, text: 'Electric streets alive tonight', translation: '\u4ECA\u591C\u8857\u9053\u901A\u7535', emotion: 'energetic' },
      { time: 18, text: 'Pixels painting city lights', translation: '\u50CF\u7D20\u63CF\u7ED8\u57CE\u5E02\u706F\u706B', emotion: 'energetic' },
      { time: 28, text: 'Running through the data stream', translation: '\u7A7F\u884C\u4E8E\u6570\u636E\u6D41', emotion: 'energetic' },
      { time: 38, text: 'Chasing down a digital dream', translation: '\u8FFD\u9010\u6570\u5B57\u4E4B\u68A6', emotion: 'happy' },
      { time: 50, text: 'The skyline burns with neon glow', translation: '\u5929\u9645\u7EBF\u71C3\u70E7\u7740\u9713\u8679', emotion: 'energetic' },
      { time: 62, text: 'Where do the broken signals go?', translation: '\u65AD\u88C2\u7684\u4FE1\u53F7\u53BB\u4E86\u54EA\u91CC\uFF1F', emotion: 'sad' },
      { time: 74, text: 'Binary hearts beat as one', translation: '\u4E8C\u8FDB\u5236\u5FC3\u8DF3\u5408\u4E00', emotion: 'happy' },
      { time: 86, text: 'Revolution has begun', translation: '\u9769\u547D\u5DF2\u7ECF\u5F00\u59CB', emotion: 'energetic' },
      { time: 100, text: 'Break through the firewall of fear', translation: '\u7A81\u7834\u6050\u60E7\u7684\u9632\u706B\u5899', emotion: 'energetic' },
      { time: 114, text: 'The future is already here', translation: '\u672A\u6765\u5DF2\u7ECF\u5230\u6765', emotion: 'happy' },
      { time: 128, text: 'Upload your soul to the cloud', translation: '\u5C06\u7075\u9B42\u4E0A\u4F20\u81F3\u4E91\u7AEF', emotion: 'calm' },
      { time: 142, text: 'Standing out among the crowd', translation: '\u5728\u4EBA\u7FA4\u4E2D\u8131\u9896\u800C\u51FA', emotion: 'happy' },
      { time: 156, text: 'Neon horizon calls my name', translation: '\u9713\u8679\u5730\u5E73\u7EBF\u547C\u5524\u6211\u540D', emotion: 'energetic' },
      { time: 170, text: 'Nothing will ever be the same', translation: '\u4E00\u5207\u90FD\u5C06\u4E0D\u540C', emotion: 'calm' },
      { time: 184, text: 'We are the children of the code', translation: '\u6211\u4EEC\u662F\u4EE3\u7801\u4E4B\u5B50', emotion: 'energetic' },
      { time: 198, text: 'Walking down the neon road', translation: '\u884C\u8D70\u5728\u9713\u8679\u4E4B\u8DEF', emotion: 'calm' },
    ],
  },
  {
    id: 'track-3',
    title: 'Ocean Lullaby',
    artist: 'Tidal Echo',
    album: 'Deep Blue',
    duration: 195,
    albumArt: 'https://images.unsplash.com/photo-1729258066878-be32a863c6aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHdhdmVzJTIwc3Vuc2V0JTIwZXRoZXJlYWx8ZW58MXx8fHwxNzcwNjYyNTQ4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    chordSet: 2,
    color: '#00CED1',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u6D77\u6D6A\u58F0', emotion: 'calm' },
      { time: 10, text: 'Waves are whispering your name', translation: '\u6D77\u6D6A\u4F4E\u8BED\u4F60\u7684\u540D', emotion: 'calm' },
      { time: 22, text: 'Underneath the moonlit flame', translation: '\u6708\u5149\u4E4B\u706B\u4E4B\u4E0B', emotion: 'calm' },
      { time: 34, text: 'Shells of memories on the shore', translation: '\u8BB0\u5FC6\u7684\u8D1D\u58F3\u5728\u6C99\u6EE9', emotion: 'sad' },
      { time: 46, text: 'Echoes of forevermore', translation: '\u6C38\u6052\u7684\u56DE\u58F0', emotion: 'sad' },
      { time: 60, text: 'The tide pulls in, the tide pulls out', translation: '\u6F6E\u8D77\u6F6E\u843D', emotion: 'neutral' },
      { time: 74, text: "That's what living is about", translation: '\u8FD9\u5C31\u662F\u751F\u6D3B', emotion: 'calm' },
      { time: 88, text: 'Salty tears meet salty sea', translation: '\u54B8\u6CEA\u6C47\u5165\u54B8\u6D77', emotion: 'sad' },
      { time: 102, text: 'Everything flows back to me', translation: '\u4E00\u5207\u6D41\u56DE\u6211\u8EAB\u8FB9', emotion: 'calm' },
      { time: 118, text: 'Close your eyes and drift away', translation: '\u95ED\u4E0A\u53CC\u773C\u968F\u6CE2\u9010\u6D41', emotion: 'calm' },
      { time: 132, text: 'Tomorrow is another day', translation: '\u660E\u5929\u53C8\u662F\u65B0\u7684\u4E00\u5929', emotion: 'happy' },
      { time: 146, text: 'The ocean sings its lullaby', translation: '\u6D77\u6D0B\u5531\u7740\u6447\u7BEE\u66F2', emotion: 'calm' },
      { time: 162, text: 'Beneath the star-lit sky', translation: '\u5728\u661F\u5149\u7480\u7490\u7684\u5929\u7A7A\u4E0B', emotion: 'calm' },
      { time: 178, text: 'Rest now, the storm has passed', translation: '\u4F11\u606F\u5427\uFF0C\u98CE\u66B4\u5DF2\u8FC7', emotion: 'calm' },
      { time: 190, text: 'Peace at last...', translation: '\u7EC8\u4E8E\u5B89\u5B81...', emotion: 'calm' },
    ],
  },
  {
    id: 'track-4',
    title: 'Aurora Rising',
    artist: 'Northern Lights',
    album: 'Polar Dreams',
    duration: 200,
    albumArt: dMusicInstruments,
    chordSet: 3,
    color: '#7B68EE',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u6781\u5149\u521D\u73B0', emotion: 'neutral' },
      { time: 8, text: 'Colors dancing in the sky', translation: '\u8272\u5F69\u5728\u5929\u7A7A\u8D77\u821E', emotion: 'happy' },
      { time: 18, text: 'Ancient lights that never die', translation: '\u4E0D\u706D\u7684\u8FDC\u53E4\u4E4B\u5149', emotion: 'calm' },
      { time: 30, text: 'Green and purple curtains fall', translation: '\u7EFF\u7D2B\u7684\u5E55\u5E03\u964D\u4E0B', emotion: 'happy' },
      { time: 42, text: 'Nature paints her greatest wall', translation: '\u81EA\u7136\u7ED8\u5C31\u6700\u4F1F\u5927\u7684\u753B\u5899', emotion: 'energetic' },
      { time: 56, text: 'The frozen earth reflects the glow', translation: '\u51B0\u5C01\u7684\u5927\u5730\u6298\u5C04\u5149\u8292', emotion: 'calm' },
      { time: 68, text: 'Magnetic storms begin to flow', translation: '\u78C1\u66B4\u5F00\u59CB\u6D41\u6DCC', emotion: 'energetic' },
      { time: 82, text: 'We are standing at the edge', translation: '\u6211\u4EEC\u7AD9\u5728\u8FB9\u7F18', emotion: 'energetic' },
      { time: 94, text: 'Of tomorrow\'s solemn pledge', translation: '\u660E\u5929\u7684\u5E84\u4E25\u627F\u8BFA', emotion: 'happy' },
      { time: 108, text: 'Rise up with the northern fire', translation: '\u4E0E\u5317\u65B9\u4E4B\u706B\u4E00\u8D77\u5347\u8D77', emotion: 'energetic' },
      { time: 122, text: 'Higher, ever higher', translation: '\u66F4\u9AD8\uFF0C\u6C38\u8FDC\u66F4\u9AD8', emotion: 'energetic' },
      { time: 136, text: 'The aurora speaks in ancient tongue', translation: '\u6781\u5149\u4EE5\u53E4\u8BED\u8BF4\u8BDD', emotion: 'calm' },
      { time: 150, text: 'Songs that have always been sung', translation: '\u6C38\u4E16\u4F20\u5531\u7684\u6B4C', emotion: 'happy' },
      { time: 164, text: 'We are children of the light', translation: '\u6211\u4EEC\u662F\u5149\u4E4B\u5B50', emotion: 'happy' },
      { time: 178, text: 'Born between the day and night', translation: '\u751F\u4E8E\u663C\u591C\u4E4B\u95F4', emotion: 'calm' },
      { time: 192, text: 'Aurora rising...', translation: '\u6781\u5149\u5347\u8D77...', emotion: 'calm' },
    ],
  },
  {
    id: 'track-5',
    title: 'Forest Whispers',
    artist: 'Moss & Fern',
    album: 'Woodland Tales',
    duration: 185,
    albumArt: 'https://images.unsplash.com/photo-1698577286490-27c81e7728e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWVwJTIwZm9yZXN0JTIwbWlzdHklMjBtb3JuaW5nfGVufDF8fHx8MTc3MDY2MjU1MHww&ixlib=rb-4.1.0&q=80&w=1080',
    chordSet: 2,
    color: '#2ecc71',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u6811\u53F6\u7C0A\u7C0A', emotion: 'calm' },
      { time: 10, text: 'Walk with me through ancient trees', translation: '\u4E0E\u6211\u6F2B\u6B65\u53E4\u6811\u4E4B\u95F4', emotion: 'calm' },
      { time: 22, text: 'Listen to the morning breeze', translation: '\u8046\u542C\u6668\u98CE', emotion: 'calm' },
      { time: 34, text: 'Mushrooms growing by the stream', translation: '\u6EAA\u8FB9\u751F\u957F\u7684\u8611\u83C7', emotion: 'happy' },
      { time: 46, text: 'Everything is not what it seems', translation: '\u4E00\u5207\u5E76\u975E\u8868\u9762\u6240\u89C1', emotion: 'neutral' },
      { time: 60, text: 'Roots reach deep into the ground', translation: '\u6811\u6839\u6DF1\u5165\u5730\u4E0B', emotion: 'calm' },
      { time: 72, text: 'Sacred, wordless, healing sound', translation: '\u795E\u5723\u3001\u65E0\u8A00\u3001\u6CBB\u6108\u4E4B\u97F3', emotion: 'calm' },
      { time: 86, text: 'Butterflies and fireflies', translation: '\u8774\u8776\u4E0E\u8404\u706B\u866B', emotion: 'happy' },
      { time: 98, text: 'Dancing underneath the skies', translation: '\u5728\u5929\u7A7A\u4E0B\u7FE9\u7FE9\u8D77\u821E', emotion: 'happy' },
      { time: 112, text: 'The forest knows your deepest fear', translation: '\u68EE\u6797\u77E5\u9053\u4F60\u6700\u6DF1\u7684\u6050\u60E7', emotion: 'sad' },
      { time: 126, text: 'And whispers: you are safe here', translation: '\u4F4E\u8BED\uFF1A\u4F60\u5728\u8FD9\u91CC\u5F88\u5B89\u5168', emotion: 'calm' },
      { time: 140, text: 'Let the moss absorb your pain', translation: '\u8BA9\u82D4\u85D3\u5438\u6536\u4F60\u7684\u4F24\u75DB', emotion: 'sad' },
      { time: 154, text: 'Let the rain wash clean again', translation: '\u8BA9\u96E8\u6C34\u518D\u6B21\u6D17\u6DA4', emotion: 'calm' },
      { time: 168, text: 'In the forest, find your peace', translation: '\u5728\u68EE\u6797\u4E2D\u5BFB\u5F97\u5B89\u5B81', emotion: 'calm' },
      { time: 180, text: 'Where all the wandering can cease', translation: '\u6240\u6709\u6D41\u6D6A\u90FD\u80FD\u7EC8\u6B62', emotion: 'calm' },
    ],
  },
  {
    id: 'track-6',
    title: 'Stellar Drift',
    artist: 'Void Walker',
    album: 'Event Horizon',
    duration: 220,
    albumArt: 'https://images.unsplash.com/photo-1630638898798-776520d6f4dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYWxheHklMjBzdGFycyUyMG1pbGt5JTIwd2F5fGVufDF8fHx8MTc3MDY2MjU1MHww&ixlib=rb-4.1.0&q=80&w=1080',
    chordSet: 0,
    color: '#764ba2',
    lyrics: [
      { time: 0, text: '\u266A  \u266A  \u266A', translation: '\u865A\u7A7A\u4E4B\u5F00\u7AEF', emotion: 'neutral' },
      { time: 10, text: 'Floating through the void of space', translation: '\u6F02\u6D41\u5728\u592A\u7A7A\u865A\u7A7A', emotion: 'calm' },
      { time: 22, text: 'Time has lost its meaning here', translation: '\u65F6\u95F4\u5728\u8FD9\u91CC\u5931\u53BB\u4E86\u610F\u4E49', emotion: 'calm' },
      { time: 34, text: 'Constellations map our way', translation: '\u661F\u5EA7\u4E3A\u6211\u4EEC\u7ED8\u5236\u822A\u56FE', emotion: 'neutral' },
      { time: 48, text: 'Through the cosmic interplay', translation: '\u7A7F\u8D8A\u5B87\u5B99\u7684\u4EA4\u7EC7', emotion: 'calm' },
      { time: 62, text: 'Event horizon pulling near', translation: '\u4E8B\u4EF6\u89C6\u754C\u8D8A\u6765\u8D8A\u8FD1', emotion: 'energetic' },
      { time: 76, text: 'Beauty born from deepest fear', translation: '\u7F8E\u4E3D\u8BDE\u751F\u4E8E\u6700\u6DF1\u7684\u6050\u60E7', emotion: 'sad' },
      { time: 90, text: 'Gravity bends the light we see', translation: '\u5F15\u529B\u5F2F\u66F2\u6211\u4EEC\u6240\u89C1\u7684\u5149', emotion: 'neutral' },
      { time: 104, text: 'Warping our reality', translation: '\u626D\u66F2\u6211\u4EEC\u7684\u73B0\u5B9E', emotion: 'energetic' },
      { time: 120, text: 'Quantum echoes everywhere', translation: '\u91CF\u5B50\u56DE\u58F0\u65E0\u5904\u4E0D\u5728', emotion: 'energetic' },
      { time: 134, text: 'Particles entangled in the air', translation: '\u7C92\u5B50\u5728\u7A7A\u6C14\u4E2D\u7F20\u7ED5', emotion: 'calm' },
      { time: 148, text: 'We are made of stellar dust', translation: '\u6211\u4EEC\u7531\u661F\u5C18\u69CB\u6210', emotion: 'happy' },
      { time: 162, text: 'In the cosmos we must trust', translation: '\u6211\u4EEC\u5FC5\u987B\u4FE1\u4EFB\u5B87\u5B99', emotion: 'happy' },
      { time: 176, text: 'Drifting on through endless night', translation: '\u5728\u65E0\u5C3D\u7684\u591C\u4E2D\u6F02\u6D41', emotion: 'calm' },
      { time: 192, text: 'Guided by the stellar light', translation: '\u88AB\u661F\u5149\u5F15\u5BFC', emotion: 'calm' },
      { time: 206, text: 'Stellar drift, carry us home...', translation: '\u661F\u7684\u6F02\u79FB\uFF0C\u5E26\u6211\u4EEC\u56DE\u5BB6...', emotion: 'calm' },
    ],
  },
];
