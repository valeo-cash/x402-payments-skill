#!/usr/bin/env bash
set -e

REPO="valeo-cash/x402-payments-skill"
BRANCH="main"
SKILL_DIR="x402-payments"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   x402 Payments Skill Installer       ║"
echo "  ║   Build paid APIs with AI agents      ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Detect agent
INSTALLED=false

# Claude Code
if [ -d "$HOME/.claude" ]; then
  echo -e "${GREEN}✓${NC} Detected Claude Code"
  mkdir -p "$HOME/.claude/skills/$SKILL_DIR"
  echo "  Installing to ~/.claude/skills/$SKILL_DIR/"
  curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/SKILL.md" \
    -o "$HOME/.claude/skills/$SKILL_DIR/SKILL.md"
  mkdir -p "$HOME/.claude/skills/$SKILL_DIR/references"
  for ref in base-evm.md solana.md sentinel-router.md packages.md; do
    curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/references/$ref" \
      -o "$HOME/.claude/skills/$SKILL_DIR/references/$ref"
  done
  echo -e "  ${GREEN}✓ Claude Code skill installed${NC}"
  INSTALLED=true
fi

# Codex CLI
if [ -d "$HOME/.codex" ]; then
  echo -e "${GREEN}✓${NC} Detected Codex CLI"
  mkdir -p "$HOME/.codex/skills/$SKILL_DIR"
  echo "  Installing to ~/.codex/skills/$SKILL_DIR/"
  curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/SKILL.md" \
    -o "$HOME/.codex/skills/$SKILL_DIR/SKILL.md"
  mkdir -p "$HOME/.codex/skills/$SKILL_DIR/references"
  for ref in base-evm.md solana.md sentinel-router.md packages.md; do
    curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/references/$ref" \
      -o "$HOME/.codex/skills/$SKILL_DIR/references/$ref"
  done
  echo -e "  ${GREEN}✓ Codex CLI skill installed${NC}"
  INSTALLED=true
fi

# Cursor / Windsurf (check if we're in a project)
if [ -f "package.json" ] || [ -f "tsconfig.json" ] || [ -d ".git" ]; then
  echo -e "${YELLOW}?${NC} Detected project directory"
  read -p "  Install .cursorrules for Cursor/Windsurf? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/.cursorrules" \
      -o ".cursorrules"
    echo -e "  ${GREEN}✓ .cursorrules installed in current directory${NC}"
    INSTALLED=true
  fi
fi

# Fallback: install to Claude Code anyway
if [ "$INSTALLED" = false ]; then
  echo -e "${YELLOW}No agent detected. Installing to Claude Code default location...${NC}"
  mkdir -p "$HOME/.claude/skills/$SKILL_DIR"
  curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/SKILL.md" \
    -o "$HOME/.claude/skills/$SKILL_DIR/SKILL.md"
  mkdir -p "$HOME/.claude/skills/$SKILL_DIR/references"
  for ref in base-evm.md solana.md sentinel-router.md packages.md; do
    curl -sSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$SKILL_DIR/references/$ref" \
      -o "$HOME/.claude/skills/$SKILL_DIR/references/$ref"
  done
  echo -e "${GREEN}✓ Installed to ~/.claude/skills/$SKILL_DIR/${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC} The x402 payments skill is now installed."
echo ""
echo "Next steps:"
echo "  1. Open your AI agent (Claude Code, Cursor, Codex)"
echo "  2. Ask: \"Help me monetize my API with x402\""
echo "  3. Or: \"Set up x402 payments on Base with USDC\""
echo ""
echo -e "Docs: ${CYAN}https://github.com/$REPO${NC}"
echo -e "Router: ${CYAN}npm i @x402sentinel/router${NC}"
