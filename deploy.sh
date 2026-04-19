#!/usr/bin/env bash
# Mansa Musa — one-shot deploy helper
# Run from the mansa-musa/ directory.
# Prerequisites: gh, vercel, supabase CLIs installed and logged in.

set -e

echo "⚜ Mansa Musa deploy"
echo ""

# --- 1. GitHub ---
if [ ! -d .git ]; then
  echo "→ Initializing git..."
  git init -b main
  git add .
  git commit -m "Initial commit: Mansa Musa pocket AI"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  read -p "GitHub repo name (default: mansa-musa): " REPO_NAME
  REPO_NAME=${REPO_NAME:-mansa-musa}
  read -p "Private repo? (Y/n): " PRIVATE
  PRIVATE=${PRIVATE:-Y}
  VIS_FLAG="--private"
  [ "$PRIVATE" = "n" ] || [ "$PRIVATE" = "N" ] && VIS_FLAG="--public"

  echo "→ Creating GitHub repo..."
  gh repo create "$REPO_NAME" $VIS_FLAG --source=. --push
else
  echo "→ Git remote exists, pushing..."
  git add -A && git commit -m "Update" || true
  git push
fi

echo ""
echo "✓ GitHub done."
echo ""

# --- 2. Supabase functions ---
read -p "Deploy Supabase functions now? (y/N): " DEPLOY_SB
if [ "$DEPLOY_SB" = "y" ] || [ "$DEPLOY_SB" = "Y" ]; then
  echo "→ Deploying functions..."
  supabase functions deploy mansa-musa --no-verify-jwt
  supabase functions deploy mansa-scout --no-verify-jwt
  supabase functions deploy mansa-notify --no-verify-jwt
  echo "✓ Functions deployed."
fi

echo ""

# --- 3. Vercel ---
read -p "Deploy to Vercel now? (y/N): " DEPLOY_VC
if [ "$DEPLOY_VC" = "y" ] || [ "$DEPLOY_VC" = "Y" ]; then
  echo "→ Deploying to Vercel..."
  vercel --prod
  echo "✓ Vercel deployed."
  echo ""
  echo "Remember to set these env vars in Vercel dashboard:"
  echo "  VITE_MANSA_ENDPOINT"
  echo "  VITE_SCOUT_ENDPOINT"
  echo "  VITE_SUPABASE_URL"
  echo "  VITE_SUPABASE_ANON_KEY"
fi

echo ""
echo "⚜ The Emperor is live. Open on your phone and Add to Home Screen."
