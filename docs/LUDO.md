# TOHID-BUG Ludo

The Ludo command supports a local HTML game plus server-validated WhatsApp rooms.

## Modes

- `.ludo` or `.ludo html`: opens the HTML mode picker. The offline board supports two players on one device and a local bot mode.
- `.ludo bot easy|medium|hard`: starts a server-side bot room. The bot never supplies its own dice result; the engine rolls and validates every move.
- `.ludo online @user`: creates a two-player room scoped to the current WhatsApp chat. The mentioned player can join with `.ludo accept ROOM_ID` or `.ludo join ROOM_ID`.

## Online commands

- `.ludo roll` — roll only when it is the caller's turn.
- `.ludo move 0` through `.ludo move 3` — move a validated token.
- `.ludo status` — show room, turn, dice and player progress.
- `.ludo leave` — leave and close the current room.
- `.ludo help` — show the command list.

## Rules enforced by the engine

Each player has four tokens. A token leaves base only on a six, exact finish is required, six grants an extra turn, safe squares block captures, captures return an opponent token to base, and all moves are checked against the server-side room state. Rooms are isolated by WhatsApp chat and expire after inactivity; player JIDs are checked before accepting, rolling or moving.

The HTML card is intentionally self-contained for offline play. WhatsApp group play uses the server-side room commands because an embedded WhatsApp HTML card cannot securely send arbitrary real-time actions back to the bot process.
