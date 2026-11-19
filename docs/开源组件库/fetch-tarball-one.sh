#!/usr/bin/env bash
# 单仓 tarball 拉取：fetch-tarball-one.sh <group> <owner/repo>
set -u
set -o pipefail
group="$1"
repo="$2"
name="${repo##*/}"
root="$(cd "$(dirname "$0")" && pwd)"
dest="$root/$group/$name"
marker="$root/_markers/${group}--${name}"

mkdir -p "$root/$group" "$root/_markers"
if [ -f "$marker" ] || [ -d "$dest/.git" ]; then
  [ -f "$marker" ] || touch "$marker"
  echo "SKIP $group/$name"
  exit 0
fi

mkdir -p "$dest"
if gh api "repos/$repo/tarball/HEAD" 2>>"$root/_fetch.log" | tar -xz -C "$dest" --strip-components=1 2>>"$root/_fetch.log"; then
  touch "$marker"
  echo "OK   $group/$name"
else
  echo "FAIL $group/$repo"
fi
