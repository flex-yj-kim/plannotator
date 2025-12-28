#!/bin/bash
#
# ExitPlanMode Hook - Launches Plannotator for plan approval/denial
#
# This hook intercepts ExitPlanMode, spawns a Bun server with the plan content,
# and blocks until the user approves or denies (with feedback).
#
# Exit codes:
#   0 = User approved → ExitPlanMode proceeds
#   2 = User denied → feedback sent to Claude via stderr
#

# Get the directory where this hook lives
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PLANNING_HOOK_DIR="$(dirname "$HOOK_DIR")"
SERVER_SCRIPT="$PLANNING_HOOK_DIR/server/index.ts"

# Read the event from stdin
EVENT=$(cat)

# Check if this is ExitPlanMode
TOOL_NAME=$(echo "$EVENT" | jq -r '.tool_name // empty')

if [ "$TOOL_NAME" = "ExitPlanMode" ]; then
  # Extract plan content
  PLAN=$(echo "$EVENT" | jq -r '.tool_input.plan // empty')

  if [ -n "$PLAN" ] && [ "$PLAN" != "null" ]; then
    # Launch Bun server with plan content
    # Server blocks until user makes a decision (approve/deny)
    # Server exits 0 for approve, 2 for deny (with feedback to stderr)
    cd "$PLANNING_HOOK_DIR"
    bun run "$SERVER_SCRIPT" "$PLAN"
    exit $?
  fi
fi

# If not ExitPlanMode or no plan, allow through
exit 0
