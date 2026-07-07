#!/bin/bash

# Load environment variables from .env.local (handles values with spaces)
set -a
source .env.local
set +a

# Start the development server
npm run dev
