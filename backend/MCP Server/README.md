# Settlerr MCP Server

Model Context Protocol server for Settlerr - enables Claude to help discover events using natural language.

- `get_recomanded_events` -  Natural language event search

## Setup

### 1. Install Dependencies

**Important:** Install for the system Python that Claude uses:

```bash
/usr/local/bin/python3 -m pip install --user httpx fastmcp
```

Or if you're using Homebrew Python:
```bash
python3 -m pip install --user httpx fastmcp
```

### 2. Start Backend API

**IMPORTANT:** The backend must be running for the MCP server to work!

```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

### 3. Configure Claude Desktop

**macOS**: Open/create `~/Library/Application Support/Claude/claude_desktop_config.json`

```bash
vim ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Add this configuration** (replace path with yours):

```json
{
  "mcpServers": {
    "settlerr-events": {
      "command": "python3",
      "args": [
        "/Users/alvishprasla/Code/Py/Settlerr/backend/MCP Server/settlerr_events_server.py"
      ]
    }
  }
}
```

### 4. Restart Claude Desktop

Quit Claude completely (Cmd+Q) and reopen. Look for the 🔨 hammer icon.

---

## 💬 Usage Examples

**Natural Language Event Search:**
- "Find tech events for software developers"
- "I'm looking for networking events for students"
- "Show me social events happening this weekend"
- "Events about AI and machine learning"
- "Find beginner-friendly coding workshops"