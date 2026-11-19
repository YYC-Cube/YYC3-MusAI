#!/usr/bin/env bash
# 串行补拉：跳过已存在仓库，避免 GitHub 并行限流
set -u
root="$(cd "$(dirname "$0")" && pwd)"
status="$root/_status2.log"

: > "$status"
while IFS=$'\t' read -r group repo license note; do
  case "$group" in ''|'#'*) continue ;; esac
  [ -z "${repo:-}" ] && continue
  name="${repo##*/}"
  if [ -d "$root/$group/$name/.git" ]; then
    echo "SKIP $group/$name" >> "$status"
    continue
  fi
  if GIT_TERMINAL_PROMPT=0 git clone --depth 1 --single-branch "https://github.com/$repo.git" "$root/$group/$name" >> "$root/_fetch.log" 2>&1; then
    echo "OK   $group/$name" >> "$status"
  else
    echo "FAIL $group/$repo" >> "$status"
    sleep 20
  fi
  sleep 2
done < "$root/repos.tsv"

echo "DONE" >> "$status"
