#!/bin/bash
# Runs git in the /mnt/c repo and prints one JSON line with in-distro wall time.
cd /mnt/c/bench/repo || exit 2
s=$(date +%s%N)
out=$(git "$@" 2>&1); rc=$?
e=$(date +%s%N)
n=$(printf '%s\n' "$out" | grep -c .)
printf '{"ms":%d,"lines":%d,"rc":%d}\n' $(( (e-s)/1000000 )) "$n" "$rc"
