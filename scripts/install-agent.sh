#!/usr/bin/env bash
# Installs the launchd agent that pulls the routine's overnight commits and
# rebuilds the local database. Idempotent: safe to re-run after edits.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.techcal.sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE_BIN="$(dirname "$(command -v node)")"

mkdir -p "$REPO/logs" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "$REPO" && npm run sync</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>8</integer>
    <key>Minute</key><integer>12</integer>
  </dict>
  <!-- The Mac is often asleep at 08:12; run on wake if the slot was missed. -->
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$REPO/logs/sync.log</string>
  <key>StandardErrorPath</key><string>$REPO/logs/sync.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "installed $LABEL — runs daily at 08:12 and on load"
echo "  log:       $REPO/logs/sync.log"
echo "  run now:   launchctl kickstart -k gui/$(id -u)/$LABEL"
echo "  uninstall: bash scripts/uninstall-agent.sh"
