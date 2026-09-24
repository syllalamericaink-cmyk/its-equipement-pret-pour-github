#!/bin/bash
cd /home/z/my-project
while true; do
  echo "$(date): Starting Next.js server..." >> /tmp/nextprod.log
  npx next start -p 3000 >> /tmp/nextprod.log 2>&1
  EXIT=$?
  echo "$(date): Server exited with code $EXIT" >> /tmp/nextprod.log
  sleep 2
done
