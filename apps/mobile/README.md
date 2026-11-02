# VARTA Mobile App (React Native & Expo)

A high-performance, modern React Native mobile application for **VARTA (Baat Sabki)**, built with React Native and Expo. The app mirrors all 11 screens from the design mockups with rich Indian saffron branding, tricolor accents, micro-interactions, and live backend connectivity.

> **Note on Version Control:** As requested, this mobile application is strictly git-ignored (`.gitignore`) so that it is never committed or pushed to GitHub.

---

## 📱 All 11 Screens Implemented

1. **Screen 1 — Onboarding / Welcome Splash**
   - Stylized VARTA tricolor ribbon logo & *"Baat Sabki"* tagline
   - Large headline: *"Real People. Real Conversations."*
   - Subtitle: *"India's space for conversations, ideas and community."*
   - Indian youth illustration with monument silhouettes & tricolor ribbon
   - 3-dot pagination indicator
   - *"Get Started →"* action button

2. **Screen 2 — Sign In / Authentication**
   - Warm monument skyline watermark background
   - *"Welcome Back"* header & *"Sign in to your VARTA account"*
   - Inputs for Email/Username and Password with eye toggle
   - *"Forgot password?"* link
   - Saffron *"Sign In"* button
   - Social authentication buttons (Google, Apple, Phone)
   - *"Don't have an account? Create Account"* footer link

3. **Screen 3 — Home Feed**
   - Header with user avatar, centered VARTA logo, and notification bell with badge
   - Category filter tabs (*For You*, *India Trends*, *Technology*, *Travel*, *Sports*)
   - Quick Compose box (*"What's on your mind?"*) with Photo, Video, Poll, and GIF shortcuts
   - Post Card with author avatar, verified badge, handle, post text, Varanasi sunrise photo, and interactive actions (Comments, Reposts, Likes, Bookmark, Share)
   - Bottom navigation bar with 5 items and floating orange (+) action button

4. **Screen 4 — Explore**
   - Header title & *"Search people, topics, communities..."* search bar
   - Filter chips (*Trending*, *People*, *Communities*, *Topics*)
   - Top 5 Trending cards with rank numbers, category, post counts, and thumbnails:
     - `#1 #WorldCup2026` (Sports)
     - `#2 #ISRO` (Technology)
     - `#3 #NewIndia` (Politics)
     - `#4 #ElectricVehicles` (Business)
     - `#5 #IncredibleIndia` (Travel)

5. **Screen 5 — Post Detail**
   - Header with back arrow `<` and *"Post"* title
   - Author row with verified checkmark, handle, and toggleable *"Follow"* / *"Following"* button
   - Full post text & high-resolution India Gate dusk photograph
   - Timestamp (*12:30 PM · 26 Oct 2026*) & stats row (*1.2K Reposts · 4.5K Likes*)
   - Action buttons row (Reply, Repost, Like, Bookmark, Share)
   - Threaded replies list with Neha Patel reply (*"Beautiful capture! India always inspires ❤️"*)
   - Sticky bottom reply composer with user avatar, input, and send button

6. **Screen 6 — Profile**
   - Grand temple / monument banner cover
   - Circular profile avatar with white border overlapping the banner
   - *"Edit Profile"* button
   - Display name (*rakesh prasad*), handle (*@raka92*), bio (*Tech | Travel | India | Food | Community Building 🇮🇳*)
   - Location (*Vadodara, India*) & Joined date (*Joined Oct 2026*)
   - Follower stats (*43 Following · 89 Followers*)
   - Tab bar (*Posts*, *Replies*, *Media*, *Likes*)
   - User posts list with Jharkhand waterfall photo card

7. **Screen 7 — Create Post**
   - Header with back button, *"Create Post"*, and saffron *"Post"* button
   - User avatar & audience selector pill (*Everyone 🌐 ▾*)
   - Multiline text area: *"What's on your mind?"*
   - Media carousel preview with attached thumbnails and "+" card
   - Attachment options list:
     - 📷 *Add Photo / Video*
     - 📊 *Add Poll*
     - 📍 *Add Location*
     - 🏷️ *Add Topic*

8. **Screen 8 — Messages**
   - Header with back button & *"Messages"* title
   - Search bar: *"Search messages..."*
   - Chat threads list:
     - *VARTA Team* (verified badge, "Welcome to VARTA!", 11:20 AM)
     - *Aarav Sharma* (orange unread badge "2", "Let's connect on this topic...", 10:45 AM)
     - *Neha Patel* ("Thanks for sharing 🙏", Yesterday)
     - *Rohit Mehta* ("Are you joining the event?", Yesterday)
     - *India Trends* ("New updates available!", Tue)
     - *Vikram Singh* ("Great insights!", Tue)

9. **Screen 9 — Notifications**
   - Header with back button & *"Notifications"* title
   - Filter pills: *All*, *Mentions*, *Replies*, *Likes*
   - Activity notifications with colorful category badge icons:
     - ❤️ *Aarav Sharma liked your post* (2 minutes ago)
     - 👤 *VARTA Official started following you* (10 minutes ago)
     - 💬 *Neha Patel replied to your post: "Beautiful thoughts! 🙏"* (1 hour ago)
     - 📈 *Your post is trending in India Trends* (Yesterday)
     - 💬 *Vikram Singh liked your comment* (Yesterday)

10. **Screen 10 — Communities**
    - Header with back button & *"Communities"* title
    - Search bar: *"Search communities..."*
    - Filter chips (*Recommended*, *India*, *Technology*, *Travel*)
    - Community cards with avatars, member counts, and toggleable *"Join"* / *"Joined"* buttons:
      - *India Trends* (125K members)
      - *Tech & Innovation* (85K members)
      - *Travel India* (78K members)
      - *Food Lovers* (92K members)
      - *Photography India* (61K members)

11. **Screen 11 — Search**
    - Search bar pre-filled with *"Varanasi"* and *"✕"* clear button
    - Category tabs (*All*, *Posts*, *People*, *Communities*, *Topics*)
    - Search results list matching *"Varanasi"*:
      - *Travel India* (@travelindia · 2d): *"Varanasi — the city that never gets old #Varanasi #incredibleindia"*
      - *Rohan Mehta* (@rohan_travels · 5d): *"Magical evenings at Varanasi ghat 🙏 #Travel #Varanasi"*

---

## 🚀 How to Run the Mobile App

### 1. Run in Web Browser (with Phone Frame Preview)
```bash
cd apps/mobile
npm run web
```
or from the repository root:
```bash
npm run web --prefix apps/mobile
```

### 2. Run with Expo Go on a Physical Phone (iOS / Android)
```bash
cd apps/mobile
npx expo start
```
- Install **Expo Go** from the App Store (iOS) or Google Play Store (Android).
- Scan the QR code in the terminal to open the app on your mobile device.

### 3. Run on Android Emulator
```bash
cd apps/mobile
npm run android
```

### 4. Run on iOS Simulator (macOS)
```bash
cd apps/mobile
npm run ios
```

---

## 🎛️ Interactive Screen Switcher

The app includes a floating **"📱 Switch Screen ▾"** dock button visible on all views. Tapping it opens a modal list of all 11 screens, allowing instant 1-tap navigation to test and inspect any screen immediately!

---

## 🔌 Backend Integration

The app includes an API client in `src/api/client.ts` configured to connect to the local NestJS backend at `http://localhost:3001/api/v1`. If the backend is unreachable or offline, the app seamlessly falls back to high-fidelity mock data matching the screenshot mockups.
