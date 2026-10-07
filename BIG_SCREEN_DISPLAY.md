# Big Screen Display for Live Matches

## Overview

A full-screen, optimized scoreboard display designed for large screens at the football ground/stadium to show live match scores to the audience.

## Features

✅ **Massive, readable text** - Scores displayed at 240px, team names at 120px
✅ **Real-time updates** - Auto-refreshes every 5 seconds
✅ **Robust fallback system** - Connection error handling with visual indicators
✅ **Offline detection** - Shows status when network is down
✅ **Full-screen layout** - No navigation, no clutter
✅ **Live badge** - Prominent pulsing indicator for live matches
✅ **Winner announcement** - Large banner for finished matches
✅ **Professional design** - Dark gradient background with subtle patterns
✅ **Team logos** - Large, crisp logo display (300px)
✅ **Last update timestamp** - Shows when scores were last refreshed

## How to Use

### Access the Big Screen Display

Use the dedicated `/display/matches/[id]` route:

```
Normal view:
https://www.woxsenstudentcouncil.in/sports/matches/26

Big screen view:
https://www.woxsenstudentcouncil.in/display/matches/26
```

### Setup at the Ground

1. **Open the URL** on the display computer/device
2. **Press F11** to enter fullscreen mode (or use browser fullscreen)
3. **Let it run** - It will auto-update every 5 seconds

### What the Audience Sees

- **Team names** - Huge text on left and right
- **Team logos** - Large, clear logos (if available)
- **Live score** - Center of screen in massive numbers
- **Competition title** - At the top (e.g., "Woxsen Football League")
- **Venue** - Bottom left corner
- **Last update time** - Bottom right corner
- **Live indicator** - Top right with pulsing red dot
- **Connection status** - Top left if offline/error

### Fallback System

The display includes multiple fallback mechanisms:

1. **API Timeout Protection** - 4-second timeout on score fetches
2. **Auto-retry** - Continues polling every 5 seconds even on error
3. **Offline Detection** - Monitors `navigator.onLine` status
4. **Immediate Recovery** - Fetches scores immediately when connection restored
5. **Visual Indicators** - Shows connection errors prominently
6. **Cached Display** - Shows last known scores even when offline

### Technical Details

**Score Update Method:**
- Primary: Fetches from `/api/sports/scores` every 5 seconds
- Fallback: Shows last known data if fetch fails
- Recovery: Immediate refetch when connection restored

**Connection States:**
- ✅ Online & Working - No indicator
- ⚠️ Connection Error - Red badge top-left: "Connection Error"
- 🔴 Offline - Red badge top-left: "Offline"

**Browser Compatibility:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

**Recommended Setup:**
- Screen Resolution: 1920×1080 or higher
- Browser: Latest Chrome/Edge
- Connection: Wired ethernet (more reliable than WiFi)
- Refresh: Not needed - auto-updates

### Match States

**Scheduled Match:**
- Shows "VS" instead of score
- No live indicator
- Team names and logos displayed

**Live Match:**
- Pulsing red "LIVE" badge top right
- Scores in red accent color
- Shadow/glow effects
- Updates every 5 seconds

**Finished Match:**
- Final score displayed
- Winner banner at bottom with name and title
- No live badge

**Cancelled Match:**
- Not shown in big screen mode (use normal view)

### Troubleshooting

**Scores not updating?**
- Check bottom-right timestamp - should update every ~5 seconds
- Check for connection error badge at top-left
- Check if `/api/sports/scores` endpoint is responding
- Verify match ID is correct

**Display looks wrong?**
- Press F11 for fullscreen
- Make sure you're using `/display/matches/[id]` URL (not `/sports/matches/[id]`)
- Clear browser cache and reload
- Check screen resolution (minimum 1280×720)

**Connection errors?**
- Check network connection
- Verify API endpoint is accessible
- Look for firewall/proxy issues
- Check browser console for errors

### API Endpoint

The big screen fetches from:
```
GET /api/sports/scores
```

Returns array of all live match updates:
```json
[
  {
    "id": 26,
    "status": "live",
    "scoreA": 2,
    "scoreB": 1,
    "postMatch": { "winnerName": null, "winnerTitle": null },
    "events": [...]
  }
]
```

### Keyboard Shortcuts

- **F11** - Toggle fullscreen
- **Escape** - Exit fullscreen
- **F5 / Ctrl+R** - Force refresh (not normally needed)
- **Ctrl+Shift+I** - Open DevTools for debugging

## Example URLs

```
Match 26 (normal):
https://www.woxsenstudentcouncil.in/sports/matches/26

Match 26 (big screen):
https://www.woxsenstudentcouncil.in/display/matches/26

Match 25 (big screen):
https://www.woxsenstudentcouncil.in/display/matches/25

Local development:
http://localhost:3000/display/matches/26
```

## Best Practices

✅ **DO:**
- Use wired ethernet connection
- Use fullscreen mode (F11)
- Leave the page running during the match
- Check the display before the match starts
- Have a backup device ready

❌ **DON'T:**
- Navigate away during the match
- Close fullscreen during the match
- Rely on WiFi in crowded areas
- Forget to verify the match ID
- Ignore connection error indicators
