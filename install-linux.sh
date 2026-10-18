#!/bin/sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); FF="$HOME/.mozilla/firefox"
pgrep -u "$USER" -x firefox >/dev/null 2>&1 && { echo "close firefox first."; exit 1; }
PROFILE="${PROFILE:-$FF/$(awk -F= '/^\[Install/{i=1} i&&/^Default=/{print $2; exit}' "$FF/profiles.ini")}"
[ -d "$PROFILE" ] || { echo "profile not found, run:  PROFILE=/path/to/profile sh install-linux.sh"; exit 1; }
for APP in /usr/lib/firefox /usr/lib64/firefox /opt/firefox; do [ -x "$APP/firefox" ] && break; done
if [ ! -f "$APP/config.js" ]; then
  echo "copying the script loader into $APP (asks for your password)"
  if command -v pkexec >/dev/null 2>&1; then pkexec cp -r "$HERE/1-firefox-program-folder/." "$APP/"; else sudo cp -r "$HERE/1-firefox-program-folder/." "$APP/"; fi
fi
[ -e "$PROFILE/chrome" ] && mv "$PROFILE/chrome" "$PROFILE/chrome.before-ie8.$(date +%s)"
cp -r "$HERE/2-profile-folder/chrome" "$PROFILE/chrome"
[ -f "$PROFILE/user.js" ] && cp "$PROFILE/user.js" "$PROFILE/user.js.before-ie8"
cat "$HERE/2-profile-folder/user.js" >> "$PROFILE/user.js"
rm -rf "$PROFILE/startupCache"
echo "installed into $PROFILE. start with: firefox -purgecaches"
