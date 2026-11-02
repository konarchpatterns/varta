import { Post, User, TrendingItem, MessageThread, NotificationItem, CommunityItem, Comment } from '../types';

export const currentUser: User = {
  id: 'user-rakesh',
  name: 'rakesh prasad',
  handle: '@raka92',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  bio: 'Tech | Travel | India | Food | Community Building 🇮🇳',
  location: 'Vadodara, India',
  joinedDate: 'Joined Oct 2026',
  followingCount: 43,
  followersCount: 89,
  bannerImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&auto=format&fit=crop&q=80', // Indian heritage monument
};

export const aaravSharmaUser: User = {
  id: 'user-aarav',
  name: 'Aarav Sharma',
  handle: '@aarav_sharma',
  verified: true,
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
};

export const vartaOfficialUser: User = {
  id: 'user-varta-official',
  name: 'VARTA Official',
  handle: '@varta_official',
  verified: true,
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
};

export const nehaPatelUser: User = {
  id: 'user-neha',
  name: 'Neha Patel',
  handle: '@neha_patel',
  verified: false,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
};

export const travelIndiaUser: User = {
  id: 'user-travel-india',
  name: 'Travel India',
  handle: '@travelindia',
  verified: true,
  avatar: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=300&auto=format&fit=crop&q=80',
};

export const rohanMehtaUser: User = {
  id: 'user-rohan',
  name: 'Rohan Mehta',
  handle: '@rohan_travels',
  verified: false,
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
};

// Home Feed Post
export const homePosts: Post[] = [
  {
    id: 'post-aarav-varanasi',
    author: aaravSharmaUser,
    content:
      "Varanasi sunrise hits differently when you realize how ancient yet forward-thinking this nation is. India isn't just watching the future unfold, we're actively building it. #NewIndia #VARTA #Varanasi",
    createdAt: '2h',
    media: [
      {
        id: 'media-varanasi-dawn',
        url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200&auto=format&fit=crop&q=80',
        type: 'image',
        aspectRatio: 16 / 9,
      },
    ],
    likes: 12000,
    reposts: 4500,
    replies: 1200,
    bookmarks: 840,
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
    category: 'India Trends',
  },
  {
    id: 'post-varta-official-gate',
    author: vartaOfficialUser,
    content: 'Real stories. Real people. Real India. #VARTA #BaatSabki #India',
    createdAt: '4h',
    media: [
      {
        id: 'media-india-gate',
        url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=80',
        type: 'image',
        aspectRatio: 16 / 9,
      },
    ],
    likes: 4500,
    reposts: 1200,
    replies: 340,
    bookmarks: 512,
    isLiked: true,
    isReposted: false,
    isBookmarked: true,
    category: 'For You',
  },
];

// Detail Post (Screen 5)
export const postDetailItem: Post = {
  id: 'post-detail-varta',
  author: vartaOfficialUser,
  content: 'Real stories. Real people. Real India. #VARTA #BaatSabki #India',
  createdAt: '12:30 PM · 26 Oct 2026',
  media: [
    {
      id: 'media-india-gate-large',
      url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=80',
      type: 'image',
      aspectRatio: 16 / 9,
    },
  ],
  likes: 4500,
  reposts: 1200,
  replies: 12,
  bookmarks: 320,
  isLiked: false,
  isReposted: false,
  isBookmarked: false,
  isFollowing: false,
};

export const postReplies: Comment[] = [
  {
    id: 'reply-neha',
    author: nehaPatelUser,
    content: 'Beautiful capture! India always inspires ❤️',
    createdAt: '3h',
    likes: 256,
    replies: 12,
    isLiked: false,
  },
  {
    id: 'reply-aarav',
    author: aaravSharmaUser,
    content: 'Such pride seeing our national landmarks highlighted so majestically! 🇮🇳',
    createdAt: '2h',
    likes: 89,
    replies: 4,
    isLiked: false,
  },
];

// Explore Trending (Screen 4)
export const trendingItems: TrendingItem[] = [
  {
    id: 'trend-1',
    rank: 1,
    tag: '#WorldCup2026',
    category: 'Sports · Trending',
    postCount: '45.2K posts',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'trend-2',
    rank: 2,
    tag: '#ISRO',
    category: 'Technology · Trending',
    postCount: '32.1K posts',
    imageUrl: 'https://images.unsplash.com/photo-1517976487502-5100ef26d40e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'trend-3',
    rank: 3,
    tag: '#NewIndia',
    category: 'Politics · Trending',
    postCount: '28.4K posts',
    imageUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'trend-4',
    rank: 4,
    tag: '#ElectricVehicles',
    category: 'Business · Trending',
    postCount: '18.9K posts',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'trend-5',
    rank: 5,
    tag: '#IncredibleIndia',
    category: 'Travel · Trending',
    postCount: '25.3K posts',
    imageUrl: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=200&auto=format&fit=crop&q=80',
  },
];

// Profile Posts (Screen 6)
export const profileUserPosts: Post[] = [
  {
    id: 'post-rakesh-1',
    author: currentUser,
    content: 'JHARKHAND: हुंडरू फॉल्स का मनोरम दृश्य [via Jharkhand Latest News]\nजलप्रपात की कलकल धारा और प्राकृतिक सौंदर्य मन मोह लेती है। 🌿💧 #Jharkhand #TravelIndia #Nature',
    createdAt: '26 Oct 2026',
    media: [
      {
        id: 'media-jharkhand-falls',
        url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&auto=format&fit=crop&q=80',
        type: 'image',
        aspectRatio: 16 / 9,
      },
    ],
    likes: 184,
    reposts: 28,
    replies: 16,
    bookmarks: 14,
    isLiked: true,
  },
];



// Communities (Screen 10)
export const communitiesList: CommunityItem[] = [
  {
    id: 'comm-1',
    name: 'India Trends',
    members: '125K members',
    category: 'India',
    avatar: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
    isJoined: false,
  },
  {
    id: 'comm-2',
    name: 'Tech & Innovation',
    members: '85K members',
    category: 'Technology',
    avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    isJoined: false,
  },
  {
    id: 'comm-3',
    name: 'Travel India',
    members: '78K members',
    category: 'Travel',
    avatar: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=200&auto=format&fit=crop&q=80',
    isJoined: false,
  },
  {
    id: 'comm-4',
    name: 'Food Lovers',
    members: '92K members',
    category: 'Food',
    avatar: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&auto=format&fit=crop&q=80',
    isJoined: false,
  },
  {
    id: 'comm-5',
    name: 'Photography India',
    members: '61K members',
    category: 'Art',
    avatar: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&auto=format&fit=crop&q=80',
    isJoined: false,
  },
];

// Search Results for "Varanasi" (Screen 11)
export const searchPostsResults: Post[] = [
  {
    id: 'search-varanasi-1',
    author: travelIndiaUser,
    content: 'Varanasi — the city that never gets old #Varanasi #incredibleindia',
    createdAt: '2d',
    media: [
      {
        id: 'media-varanasi-dusk',
        url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200&auto=format&fit=crop&q=80',
        type: 'image',
        aspectRatio: 16 / 9,
      },
    ],
    likes: 2100,
    reposts: 560,
    replies: 124,
    bookmarks: 310,
    isLiked: false,
    category: 'Travel',
  },
  {
    id: 'search-varanasi-2',
    author: rohanMehtaUser,
    content: 'Magical evenings at Varanasi ghat 🙏 #Travel #Varanasi',
    createdAt: '5d',
    media: [
      {
        id: 'media-varanasi-aarti',
        url: 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=1200&auto=format&fit=crop&q=80',
        type: 'image',
        aspectRatio: 16 / 9,
      },
    ],
    likes: 980,
    reposts: 140,
    replies: 45,
    bookmarks: 85,
    isLiked: true,
    category: 'Travel',
  },
];
