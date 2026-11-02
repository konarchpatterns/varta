# Mobile app — glitch fixes (VARTA)

The Expo app in `apps/mobile` looked like a finished product but most screens were
**static mock UI**. Anything that "worked" on the website and not on the phone was
caused by the mobile layer never talking to the NestJS API properly. This is what
was wrong and what changed.

## Root causes found

| # | Glitch | Cause |
|---|---|---|
| 1 | App opened **already logged in as "Aarav"**, and every page had data before you signed in | `AuthContext` hard-coded `isAuthenticated: true` + a demo user |
| 2 | Login/registration silently "succeeded" when the server was unreachable | API client fell back to mock users/tokens on any network error |
| 3 | Likes, reposts, bookmarks reverted or did nothing | optimistic update with no rollback, request result ignored, no re-sync |
| 4 | Direct messages were a fake chat | `MessagesScreen` used `mockData` + a 900 ms `setTimeout` bot that replied for the other person |
| 5 | No messages / notifications from other users | app had no Socket.io connection at all |
| 6 | Profile timeline showed invented posts | `profileUserPosts` mock list + fabricated "author posts" |
| 7 | Explore/Search ignored the server | local mock arrays merged over API results |
| 8 | Notifications, communities, bookmarks stayed stale forever | fetch once on mount, never refetched, no pull-to-refresh, no error state |
| 9 | Session lost on every app restart | token kept only in memory (no storage), no `/auth/me` bootstrap |
| 10 | Android emulator could never reach the API | base URL defaulted to `localhost` (should be `10.0.2.2` on Android) |
| 11 | Avatar/cover "saved" but never persisted | uploaded to `/posts/media` instead of `/users/avatar` & `/users/cover` |
| 12 | Settings toggles, password change, premium badge, grievance form were local-only | no API calls behind them |
| 13 | Signed-out users landed on blank protected screens | route guard only blocked navigation, not the initial screen |

## What was built

- **`src/api/client.ts`** — one `apiRequest()` for the whole app: JSON + `FormData`,
  204 handling, `ApiError`, timeouts, **silent access-token refresh with a single retry**
  (same as `apps/web/src/lib/api.ts`), tokens persisted with AsyncStorage, refresh token
  kept locally (React Native has no cookie jar for the web's HttpOnly refresh cookie).
  Every response is mapped through defensive mappers (`mapApiPostToMobile`,
  `mapApiUserToMobile`, `mapApiCommunityToMobile`, `mapApiConversationToMobile`, …).
- **`src/api/socket.ts`** — shared Socket.io connection authenticated with the access token.
- **`src/context/AuthContext.tsx`** — session bootstrap (`hydrateSession` → `/auth/me`),
  real login / register / phone-OTP / Google / logout, `refreshUser()`, socket reconnect.
- **`src/context/PostsContext.tsx`** — feed with tabs + infinite scroll, optimistic
  like/repost/bookmark **with rollback**, poll voting, real post creation (upload →
  `/posts`, optimistic card removed if the server rejects it), replies, profile
  timelines and bookmarks from the API.
- **`MessagesScreen`** — real conversations, history, send, typing indicators, live
  `message:received`, unread counts, new-chat and group-chat creation.
- **`NotificationsScreen`, `CommunitiesScreen`, `CommunityDetailScreen`, `ExploreScreen`,
  `SearchScreen`, `ProfileScreen`, `SettingsScreen`, `PostDetailScreen`** — all wired to
  the same endpoints the web app uses, with loading / empty / error + retry states and
  pull-to-refresh.
- **New `BookmarksScreen`** (the web app has `/bookmarks`, mobile had none).
- **`LoadingScreen`** shown while the stored session is validated; route guard now also
  protects the initial screen.

## Verified

```
cd apps/mobile
npx tsc --noEmit          # clean
npx expo export --platform web --output-dir dist-preview   # bundle builds
```

## Run it

```bash
cd apps/mobile
npx expo start            # Expo Go / dev build
```

Point it at your backend with `EXPO_PUBLIC_API_URL` (defaults: production
`https://varta.kevindevops.online/api/v1`, dev `http://localhost:3001/api/v1`,
Android emulator `http://10.0.2.2:3001/api/v1`).

Web preview of the current build: `apps/mobile/dist-preview` (served at
http://127.0.0.1:59362).

## Still worth doing next

- Email-OTP login screen (API + store methods exist, no UI yet).
- Poll rendering on `PostCard` and quote-post cards.
- Video playback in the feed (`expo-video`).
- Followers / following list screens (`/users/:username/followers|following`).
- Push notifications (expo-notifications) on top of the socket stream.

## API connectivity (why the app said "Cannot reach the VARTA server")

The screens were fine — the request never left the device correctly.

1. **Base URL guessed wrong.** With no `EXPO_PUBLIC_API_URL`, the client used
   `localhost`/`10.0.2.2`, which is the phone itself on a real device.
   Now the client derives the API host from **Metro's `hostUri`** (the machine
   running `expo start`), so simulators, emulators and a physical phone on the
   same Wi-Fi all reach the dev API with no configuration.
   `EXPO_PUBLIC_API_URL` still overrides everything; release builds use production.
2. **CORS blocked Expo web.** The API only allowed `http://localhost:3000`, so a
   browser bundle served from `http://localhost:8081` / a LAN IP got no
   `Access-Control-Allow-Origin` header and the browser reported a network error.
   `apps/api/src/main.ts` now allows the configured origins plus loopback,
   private LAN ranges (10/8, 172.16/12, 192.168/16) and Expo/ngrok tunnels;
   native apps (no Origin header) are unaffected.
3. **The error message hid the cause.** It now prints the exact URL that failed,
   the sign-in screen shows the API host (and `via env | metro-host | …` in dev),
   and Settings → System Status runs a real `/health` probe with latency and the
   failing URL instead of a hard-coded "200 OK · 24ms".

## "Still cannot reach the server" — why the fix did not show up

Cause: `npx expo export --platform web` produces a **production** bundle, where
`__DEV__` is `false`. My URL resolution was gated on `__DEV__`, so the exported
web build always used the production API and printed `dev=false`. Expo **web**
(`npx expo start --web`, :8081) runs a *development* bundle (`dev=true`), which
is why it kept trying `http://localhost:3001`.

Fixes:
- The client logs `[VARTA] API base URL: … (env=…, dev=…)` at startup — check
  this first; it names the exact URL and why.
- `EXPO_PUBLIC_API_URL` is read as a literal (`process.env.EXPO_PUBLIC_API_URL`)
  because Metro only inlines literal reads.
- `EXPO_PUBLIC_API_PORT` (default `3001`) is now configurable.
- Settings → *System Status* probes **every** candidate address
  (`http://<metro-host>:3001`, `http://10.0.2.2:3001`, `http://localhost:3001`,
  production) and shows ✅/❌ per URL, with a **"Use this"** button that switches
  the running app to a working one and persists it.

## "Works on localhost:8081, not on the phone"

Those are two different bundles and two different networks:

| Where you run it | What the app talks to | Why it worked/failed |
|---|---|---|
| Browser, `http://localhost:8081` | `http://localhost:3001` | same machine — works |
| Expo Go on the phone | whatever host the bundle was told | `localhost` is the **phone itself**, so the request dies |

The phone needs your computer's **LAN IP**. Two ways, both supported now:

1. Start Metro over LAN and let the client read the host Expo served from:
   ```bash
   npx expo start --lan -c      # then scan the QR with Expo Go
   ```
   The client derives `http://<lan-ip>:3001/api/v1` from Metro's `hostUri`.
2. Pin it once in `apps/mobile/.env` (survives restarts, works for every device):
   ```bash
   EXPO_PUBLIC_LAN_HOST=192.168.4.188          # ipconfig -> IPv4 Address
   EXPO_PUBLIC_API_URL=http://192.168.4.188:3001/api/v1   # optional, wins over all
   ```

Verified on this machine: `http://192.168.4.188:3001/api/v1/health` → `200`.
The API binds `0.0.0.0`, so only Windows Firewall can still block it — allow
Node.js on Private networks if the phone's browser cannot open that URL.

## Explore screen — now fully functional

| Element | Before | Now |
|---|---|---|
| Communities tab in search | counted in "37 results" but **rendered nothing** | server-side `GET /explore/communities?search=` — real matches, loading state, empty state |
| People / Posts / Topics tabs | only fetched when tab = All-ish | correct `type` sent to `/explore/search` |
| `#hashtag` search | plain text search | dedicated `/explore/hashtag/:tag` feed, merged with search posts |
| Category chips | client-side substring filter that hid real posts | `GET /feed/for-you?category=…` (same mapping as the website) |
| Hero hashtag chips | hard-coded list | live from `/explore/trending` |
| Communities strip | loaded once | refetched per category from the API |
| Mention tap | fake user object with a random avatar | real username → profile |
| Search errors | silently empty | shown above the results |

## Post interaction settings (who can reply / quote posts)

The modal existed but its choices were thrown away. Now they are stored and enforced.

**API**
- `Post` gained: `replySettings` (`anyone|nobody|custom`), `allowQuotePosts`,
  `replyRuleFollowers`, `replyRuleFollowing`, `replyRuleMentioned`
  (`npx prisma db push` applied to the dev DB).
- `POST /posts` parses `replySettings` (`anyone` / `nobody` / a JSON rule array
  such as `["followers","mentioned"]`) plus `allowQuotePosts`, persists it and
  returns it with `replyRules` + `allowQuotePosts`.
- **Replies are enforced**: `createPost` rejects a reply to a restricted post
  with `403 "The author has limited who can reply to this post."`
  (owner and explicitly allowed rules still pass).
- **Quotes are enforced**: quoting a post with `allowQuotePosts = false` → `403`.
- New `GET /posts/:id/interaction` returns `canReply`, `replySettings`,
  `allowQuotePosts`, `replyRules`, `replyRestrictionReason` for the viewer.

**Mobile**
- The composer serialises the modal state (`serializeReplySettings`) instead of
  sending the whole object, shows a summary line (“🔒 Nobody can reply · quotes
  off”) and a toast that reflects the choice.
- The post screen reads `/posts/:id/interaction`: the reply box is replaced by
  “🔒 The author has limited who can reply to this post.” and chips show
  “Replies off / Limited replies / Quotes off”.

**Web**
- `PostComposer` had the same bug (it sent the rule *object* as a string);
  it now sends the enabled rule names, matching the API.

Verified end-to-end with curl: `nobody` + `allowQuotePosts:false` → other user
gets `403` on reply and `canReply:false`; `custom ["followers","mentioned"]`
persists and returns the right `replyRules`.

## Hosted preview (expo.app) pointed at localhost

`https://<slug>.on.expo.app` is a **hosted** build, not your machine, so
`http://localhost:3001` there means the *visitor's* computer → "cannot reach
the server" for everyone except you.

- The client now detects a hosted web bundle (any public hostname, i.e. not
  localhost / 127.x / 10.x / 172.16-31.x / 192.168.x) and uses the **deployed
  API** (`https://varta.kevindevops.online/api/v1`) instead of a LAN address.
  `EXPO_PUBLIC_API_URL` still overrides everything.
- The sign-in badge shows the source (`via hosted-web` / `via metro-host` / `via env`).
- API CORS now also allows `*.expo.app`, `*.expo.dev`, `*.vercel.app`,
  `*.netlify.app` (verified: the hosted origin gets `Access-Control-Allow-Origin`).
- The API was restarted here — it is answering on `:3001` again (it had stopped
  during the schema change).

### OTP honesty
- If no SMS gateway is configured, `send-otp` used to answer "code dispatched"
  while only logging it. It now says the gateway is missing, and with
  `DEV_OTP_EXPOSE=true` returns `devOtp` which the app prefills and shows in a
  yellow banner (demo mode).
- Your Fast2SMS key is configured and delivered for real in testing
  (`[Fast2SMS] Successfully sent SMS OTP … Request ID: SCYD7i8CtJW3zjv`).

## Profile picture / cover picture upload

**Why it failed on mobile:** the uploads were fire-and-forget. The picker showed a
`data:` preview, the upload promise had an empty `.catch()`, and on Save the code
explicitly skipped any value starting with `data:` — so on a phone (where the
preview is always `data:`/`file://`) nothing was ever sent to the server, and no
error was shown.

**Fixes**
- `uploadAvatarApi` / `uploadCoverApi` / `uploadMediaApi` share one `appendFilePart`
  helper that always sends a filename with a real extension (`avatar-<ts>.jpg`) and
  a proper MIME type — required by React Native's FormData, and by the API's
  extension whitelist (Multer silently drops a file named `…/ImagePicker/xyz`).
- Uploads are awaited, tracked in state (`uploadedAvatar` / `uploadedCover`) and
  reflected immediately via `updateUser()`, so the avatar/banner change the moment
  the upload finishes — even if you close the modal without pressing Save.
- Errors are surfaced in the existing toast (“Avatar upload failed: …”) instead of
  being swallowed; the Save button shows “Uploading avatar…/cover…” while busy.
- Save now uses the uploaded URL (or a manually typed `https://` URL), never the
  `data:` preview.

**Verified against the running API** (multipart, same shape the app sends):
```
POST /users/avatar  → 201 {"avatarUrl":"…/uploads/avatars/<uuid>.png"}
POST /users/cover   → 201 {"coverUrl":"…/uploads/covers/<uuid>.png"}
GET  <coverUrl>     → 200 image/png
GET  /auth/me       → profile.avatarUrl / profile.coverUrl updated
```
Note: the returned URL is built from `MEDIA_PUBLIC_URL`, so on the VPS it must be
`https://varta.kevindevops.online/uploads` (it is, in the production template).
