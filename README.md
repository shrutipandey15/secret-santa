# 🎄 Secret Santa - Team Appreciation Portal

A real-time web app for Secret Santa with heartfelt messages, reactions, and a magical reveal experience.

---

## ⚡ Quick Start

### Setup (5 minutes)
```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase
# - Create project at firebase.google.com
# - Enable Realtime Database
# - Copy config to src/firebase.js

# 3. Run
npm start
```

Open `http://localhost:3000` in your browser.

---

## 📱 How to Use

### 👑 For Admin

**Setup Phase:**
1. Add participant names
2. Set admin code (keep it secret!)
3. Click "Generate assignments"

**Writing Phase:**
- Monitor progress dashboard
- See who submitted (✅ green) vs pending (⏳ red)
- Start reveal when ready (or proceed anyway with warning)

**Reveal Phase:**
- Click "Reveal author" to show who wrote
- Use Previous/Next buttons or ← → arrow keys
- Last message: "Continue to Finale"

**Finale:**
- View celebration stats
- "Start New Session" to reset

### 👥 For Participants

**Writing:**
1. Click your name → Create/enter PIN
2. Write message to assigned person
3. Preview (optional) → Save
4. Can edit anytime (✏️ icon) until reveal starts

**Reveal:**
- Watch messages appear
- React with emojis (❤️ ⭐ 👁️ ✨ 🔥)

---

## ✨ Features

- **Real-time sync** - Everyone sees updates instantly via Firebase
- **PIN protection** - Secure messages with personal PINs
- **Edit anytime** - Modify messages before reveal starts
- **Progress tracking** - Admin dashboard shows submission status
- **Navigation controls** - Previous/Next buttons + keyboard shortcuts
- **Preview** - See how message will look before saving
- **Reactions** - 5 emoji reactions during reveal
- **Stats finale** - Celebration page with totals and team grid
- **Mobile responsive** - Works on all devices
- **Beautiful UI** - Christmas theme with animations and snowflakes

---

## ⌨️ Keyboard Shortcuts (Admin)

- `←` Previous message
- `→` Reveal author / Next message

---

## 🛠️ Firebase Setup

1. Go to [firebase.google.com](https://firebase.google.com)
2. Create new project
3. Enable Realtime Database (start in test mode)
4. Copy config to `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 🚨 Troubleshooting

**Can't connect:** Check Firebase config in `src/firebase.js`  
**Can't edit:** Only works during Writing phase  
**Keyboard not working:** Admin only, during Reveal phase  
**Laggy:** Reduce snowflakes in `SecretSanta.jsx` line 119 (change 30 to 15)

**Emergency Reset:**
- Red "Dev Reset" button in top-right corner
- Or visit: `http://localhost:3000/?reset=true`

---

## 🎨 Customization

**Colors:** Edit `SecretSanta.css` - search for `#0a4d3c` (green) and `#c41e3a` (red)  
**Fonts:** Change in CSS - currently uses "Mountains of Christmas" and "Quicksand"  
**Snowflakes:** Reduce count in `SecretSanta.jsx` line 119  
**Reactions:** Add more in `SecretSanta.jsx` around line 60

---

## 📋 Workflow

```
1. Setup (Admin)
   └─ Add participants → Set admin code → Generate

2. Writing (Everyone)  
   └─ Select name → Create PIN → Write → Save

3. Reveal (Admin controls)
   └─ Show message → Reveal author → Reactions → Next

4. Finale (Celebrate!)
   └─ Stats → Team grid → Start new session
```

---

## ❓ FAQ

**Q: Can people edit after submitting?**  
A: Yes, until reveal starts. Look for ✏️ icon.

**Q: What if someone doesn't write?**  
A: Admin gets warning. Can proceed anyway - shows "(No message written)".

**Q: Can I pause the reveal?**  
A: Yes, admin controls pace. Take breaks between messages.

**Q: How to reset?**  
A: Click "Dev Reset" button (top-right) or add `?reset=true` to URL.

**Q: Works on mobile?**  
A: Yes! Fully responsive. Keyboard shortcuts are desktop-only.

**Q: What if someone forgets their PIN?**  
A: They'll need to create a new one. Old message will be lost.

**Q: How long does reveal take?**  
A: ~30-60 seconds per message. 10 people = ~10 minutes.

---

## 📦 Tech Stack

- React 18
- Firebase Realtime Database
- Lucide React Icons
- Mountains of Christmas font (Google Fonts)

---

## 🚀 Deployment

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy

# Or use Netlify, Vercel, etc.
```

---

Built with ❤️ for spreading team appreciation 🎄