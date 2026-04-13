export const landingHighlights = [
  "Verified identities and family-safe onboarding",
  "Preference-based matching tuned for Indian contexts",
  "Live chat and premium visibility controls"
];

export const landingJourney = [
  {
    id: "profile",
    title: "Build your profile in minutes",
    description:
      "Showcase values, profession, education, and lifestyle with a profile that reflects intent."
  },
  {
    id: "discover",
    title: "Discover compatible matches",
    description:
      "Swipe through curated profiles powered by preference filters and compatibility scoring."
  },
  {
    id: "connect",
    title: "Connect when interest is mutual",
    description:
      "Move to secure real-time chat only after interest acceptance, keeping interactions meaningful."
  }
];

export const dashboardStats = [
  {
    id: "profile_views",
    label: "Weekly Profile Views",
    value: "148",
    trend: "+18%"
  },
  {
    id: "interests",
    label: "New Interests",
    value: "23",
    trend: "+7%"
  },
  {
    id: "matches",
    label: "Compatibility Matches",
    value: "12",
    trend: "+11%"
  },
  {
    id: "response_time",
    label: "Avg Response Time",
    value: "2.8h",
    trend: "-12%"
  }
];

export const dashboardActivity = [
  {
    id: "a1",
    title: "Priya viewed your profile",
    time: "2m ago"
  },
  {
    id: "a2",
    title: "Rahul accepted your interest",
    time: "12m ago"
  },
  {
    id: "a3",
    title: "Your profile boost ends tonight",
    time: "1h ago"
  },
  {
    id: "a4",
    title: "Two new highly compatible profiles",
    time: "3h ago"
  }
];

export const discoverProfiles = [
  {
    id: "p1",
    name: "Ananya",
    age: 27,
    location: "Bengaluru",
    profession: "Product Designer",
    education: "M.Des",
    religion: "Hindu",
    caste: "Brahmin",
    income: "18 LPA",
    interests: ["Travel", "Yoga", "Live Music"],
    bio: "Close-knit family values, design-led career, and looking for a calm, thoughtful partner.",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "p2",
    name: "Riya",
    age: 26,
    location: "Pune",
    profession: "Chartered Accountant",
    education: "B.Com + CA",
    religion: "Hindu",
    caste: "Maratha",
    income: "16 LPA",
    interests: ["Classical Dance", "Books", "Weekend Drives"],
    bio: "Ambitious and family-first. Enjoys meaningful conversations and cultural traditions.",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "p3",
    name: "Ishita",
    age: 29,
    location: "Hyderabad",
    profession: "Data Scientist",
    education: "M.Tech",
    religion: "Hindu",
    caste: "Agarwal",
    income: "24 LPA",
    interests: ["Cooking", "Trekking", "Podcasts"],
    bio: "Balanced between career growth and family life, with strong focus on long-term commitment.",
    image:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "p4",
    name: "Meera",
    age: 28,
    location: "Mumbai",
    profession: "Marketing Lead",
    education: "MBA",
    religion: "Jain",
    caste: "Shwetambar",
    income: "22 LPA",
    interests: ["Pilates", "Art Galleries", "Coffee Trails"],
    bio: "Values openness, emotional maturity, and a supportive partnership rooted in respect.",
    image:
      "https://images.unsplash.com/photo-1485960994840-902a67e187c8?auto=format&fit=crop&w=1200&q=80"
  }
];

export const chatThreads = [
  {
    id: "u1",
    name: "Ananya",
    status: "online",
    lastMessage: "That sounds lovely. Sunday works for me.",
    unreadCount: 2
  },
  {
    id: "u2",
    name: "Rahul",
    status: "away",
    lastMessage: "Happy to connect with family over call.",
    unreadCount: 0
  },
  {
    id: "u3",
    name: "Priya",
    status: "online",
    lastMessage: "Can we share horoscope details tomorrow?",
    unreadCount: 1
  }
];

export const chatMessages = {
  u1: [
    {
      id: "m1",
      fromMe: false,
      content: "Hi! I liked your profile and especially your travel photos.",
      time: "10:10 AM"
    },
    {
      id: "m2",
      fromMe: true,
      content: "Thank you, that means a lot. Your profile felt very genuine too.",
      time: "10:12 AM"
    },
    {
      id: "m3",
      fromMe: false,
      content: "Would you like to continue this over a quick coffee this weekend?",
      time: "10:15 AM"
    }
  ],
  u2: [
    {
      id: "m4",
      fromMe: true,
      content: "Hi Rahul, nice connecting with you.",
      time: "Yesterday"
    },
    {
      id: "m5",
      fromMe: false,
      content: "Likewise! Happy to connect with family over call.",
      time: "Yesterday"
    }
  ],
  u3: [
    {
      id: "m6",
      fromMe: false,
      content: "Can we share horoscope details tomorrow?",
      time: "9:45 AM"
    }
  ]
};
