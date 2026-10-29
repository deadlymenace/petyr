#!/bin/sh
# Hosts like Railway mount volumes owned by root, which the non-root petyr
# user can't write to, so every waitlist signup fails with EACCES. When the
# container starts as root, hand the data dir to petyr, then drop to petyr
# to run the server.
set -e

if [ "$(id -u)" = "0" ]; then
  if [ -n "$PETYR_DATA_DIR" ]; then
    mkdir -p "$PETYR_DATA_DIR"
    chown -R petyr:petyr "$PETYR_DATA_DIR"
  fi
  export HOME=/home/petyr USER=petyr
  exec setpriv --reuid=petyr --regid=petyr --init-groups "$@"
fi

exec "$@"
