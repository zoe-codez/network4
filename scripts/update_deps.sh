#!/bin/bash
export PATH="./node_modules/figlet-cli/bin/:$PATH"

if command -v npx &> /dev/null
then
  figlet -f "Pagga" "upgrade npm" | npx lolcatjs
  echo
  npx ncu -u -f "@digital-alchemy/*"
  npx ncu -u -dep prod
  npm i
else
  npm i
fi

npx type-writer
