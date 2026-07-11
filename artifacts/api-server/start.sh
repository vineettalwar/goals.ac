#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=development
exec node --enable-source-maps ./dist/index.mjs
