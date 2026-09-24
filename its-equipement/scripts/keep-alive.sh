#!/bin/bash
cd /home/z/my-project
while true; do
  npx next start -p 3000 2>&1 | tee -a prod.log
  echo "[$(date)] Server crashed, restarting in 3s..."
  sleep 3
done