#!/usr/bin/env bash
# 单个仓库浅克隆：clone-one.sh <group> <owner/repo>
# 若设置 GH_TOKEN，则通过 Authorization 头认证，避免 GitHub 403 限流。
set -u
group="$1"
repo="$2"
name="${repo##*/}"
root="$(cd "$(dirname "$0")" && pwd)"
dest="$root/$group/$name"

mkdir -p "$root/$group"
if [ -d "$dest/.git" ]; then
  echo "SKIP $group/$name"
  exit 0
fi

args=()
if [ -n "${GH_TOKEN:-}" ]; then
  args=(-c "http.extraheader=Authorization: Bearer $GH_TOKEN")
fi

if GIT_TERMINAL_PROMPT=0 git "${args[@]}" clone --depth 1 --single-branch "https://github.com/$repo.git" "$dest" >> "$root/_fetch.log" 2>&1; then
  echo "OK   $group/$name"
else
  echo "FAIL $group/$repo"
fi
