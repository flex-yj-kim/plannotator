#!/bin/bash
#
# Redline Planning Hook Installer
#
# Usage: ./install.sh [target-project-dir]
#
# This script:
# 1. Builds the standalone Redline HTML if needed
# 2. Adds the ExitPlanMode hook to the target project's Claude settings
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/hooks/exit-plan-mode.sh"
REDLINE_HTML="$SCRIPT_DIR/dist/redline.html"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Redline Planning Hook Installer                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for required tools
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is required but not installed.${NC}"
  echo "Install with: brew install jq"
  exit 1
fi

# Determine target directory
TARGET_DIR="${1:-$(pwd)}"
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
  exit 1
fi

echo -e "${YELLOW}Target project: $TARGET_DIR${NC}"
echo ""

# Build if needed
if [ ! -f "$REDLINE_HTML" ]; then
  echo -e "${YELLOW}Building Redline HTML...${NC}"
  cd "$SCRIPT_DIR"
  npm install
  npm run build
  echo -e "${GREEN}✓ Build complete${NC}"
  echo ""
fi

# Create .claude directory if needed
CLAUDE_DIR="$TARGET_DIR/.claude"
mkdir -p "$CLAUDE_DIR"

SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"

# Create or merge settings
if [ -f "$SETTINGS_FILE" ]; then
  echo -e "${YELLOW}Merging with existing settings...${NC}"

  # Read existing settings
  EXISTING=$(cat "$SETTINGS_FILE")

  # Check if hook already exists
  if echo "$EXISTING" | jq -e '.hooks.PreToolUse[]?.hooks[]? | select(.command | contains("exit-plan-mode.sh"))' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Hook already installed${NC}"
  else
    # Add the new hook
    NEW_HOOK=$(cat <<EOF
{
  "matcher": "ExitPlanMode",
  "hooks": [
    {
      "type": "command",
      "command": "$HOOK_SCRIPT"
    }
  ]
}
EOF
)

    # Merge into existing settings
    UPDATED=$(echo "$EXISTING" | jq --argjson hook "$NEW_HOOK" '
      .hooks.PreToolUse = (.hooks.PreToolUse // []) + [$hook]
    ')

    echo "$UPDATED" > "$SETTINGS_FILE"
    echo -e "${GREEN}✓ Hook added to existing settings${NC}"
  fi
else
  echo -e "${YELLOW}Creating new settings file...${NC}"

  # Create new settings with hook
  cat > "$SETTINGS_FILE" <<EOF
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "$HOOK_SCRIPT"
          }
        ]
      }
    ]
  }
}
EOF
  echo -e "${GREEN}✓ Settings file created${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "When Claude calls ExitPlanMode in this project,"
echo "the Redline editor will open with the plan content."
echo ""
echo -e "${BLUE}Settings file: $SETTINGS_FILE${NC}"
echo ""
