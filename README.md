# Entourage · One Thousand and One Nights (multiplayer room game)

A host console plus a player screen for each team, joined by a 4-letter room code. No sign-in, no database, no npm install.

## Run it (needs Node 18 or newer)
    node server.js
Open http://localhost:3000 on the host laptop and press "Create a new room". The server also prints a
"Players on the same Wi-Fi" address. Teams open that address, type the room code, and tap their caravan.

## For the fest
- Put everyone on the same network. College Wi-Fi often blocks device-to-device traffic; if players cannot connect,
  use a phone hotspot or a small router.
- Show the join code on the projector (it sits at the top of the host console).
- Do a dry run with the host plus two phones before the event.

## Put it online (free tiers on Render, Railway, Fly.io or similar)
Upload this folder, set the start command to `node server.js`. The platform provides PORT. Run ONE instance only,
because rooms live in memory. If the server restarts, the host presses "Resume" or creates a new room; the host's
game state is kept in the host's browser.

## The Genie (Night 3)
By default the rulebooks are read by a built-in keyword reader. To have Claude read them instead, set
ANTHROPIC_API_KEY on the server (optional ANTHROPIC_MODEL, default claude-haiku-5-5). The key stays on the server.

## Files
- server.js: room server (rooms, live state, team answers, optional Claude call). No dependencies.
- public/index.html: the whole game (host console and player view).
