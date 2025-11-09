# Settlerr MCP Servers

Model Context Protocol servers for Settlerr - enables Claude to help with tasks and event recommendations.

## 📦 What's Included

### Tasks Server (`settlerr_tasks_server.py`)
- `get_user_tasks` - View all assigned tasks
- `generate_admin_tasks` - Generate 10 personalized settling tasks
- `check_task_completion` - Verify task completion with image analysis

### Events Server (`settlerr_events_server.py`)
- `get_recommended_events` - Get AI-matched events (scored 0-100)
- `get_all_suggested_events` - List all available events
- `get_event_details` - Get full event details
- `rsvp_to_event` - RSVP to event (adds tasks automatically)

---

## 🚀 Setup

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
    "settlerr-tasks": {
      "command": "python3",
      "args": [
        "/Users/alvishprasla/Code/Py/Settlerr/backend/MCP Server/settlerr_tasks_server.py"
      ]
    },
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

**Tasks:**
- "Show me my tasks for username alaik"
- "Generate settling tasks for user alaik"
- "Check if this task is complete" (attach image)

**Events:**
- "What events would you recommend for user alaik?"
- "Tell me about the Calgary Tech Meetup"
- "RSVP user alaik to that event"

---

## 🔍 How It Works

```
Claude → MCP Server → FastAPI Backend → DynamoDB/Gemini AI
```

MCP servers call your existing API endpoints - no backend changes needed.

---

## 🛠️ Troubleshooting

**Servers not showing:**
- Check JSON syntax in config file
- Use absolute paths
- Restart Claude completely

**Connection errors:**
- Ensure backend is running on port 8000
- Check `API_BASE_URL` in server files

**Import errors:**
- Run `pip install fastmcp httpx`

---

## 📚 API Endpoints Used

### Tasks:
- `GET /api/getUserTasks`
- `POST /api/GenerateAdminTasks`
- `POST /api/checkTaskCompletion`

### Events:
- `GET /api/getRecommendedEvents`
- `GET /api/getSuggestedEvents`
- `GET /api/getEventByName`
- `POST /api/rsvpEvent`

---

## 🎨 Features

- AI-generated personalized tasks
- Image-based task verification (Gemini Vision)
- AI event matching (0-100 scores)
- Considers interests, status, occupation, age, location
- Automatic task management

---

For full API documentation, see [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
