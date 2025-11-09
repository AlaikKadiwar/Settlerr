# Settlerr API Documentation

Base URL: `http://localhost:8000`

---

## 📋 **Endpoints Overview**

### 1. **Health Check**
- **Method**: `GET`
- **Endpoint**: `/api/health`
- **Description**: Check if API is running

**Response**:
```json
{
  "status": "OK"
}
```

---

### 2. **Check Username Availability**
- **Method**: `GET`
- **Endpoint**: `/api/checkUsername`
- **Description**: Check if a username is available or taken

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username to check |

**Example Request**:
```
GET /api/checkUsername?username=alaik
```

**Response**:
```json
{
  "success": true,
  "available": false,
  "message": "Username is already taken"
}
```

---

### 3. **Get User Tasks**
- **Method**: `GET`
- **Endpoint**: `/api/getUserTasks`
- **Description**: Get all tasks assigned to a user

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username |

**Example Request**:
```
GET /api/getUserTasks?username=alaik
```

**Response**:
```json
{
  "success": true,
  "username": "alaik",
  "tasks": [
    {
      "task_description": "Open a bank account at TD or RBC",
      "completed": false
    },
    {
      "task_description": "Meet 2 people at Tech Meetup",
      "completed": false
    }
  ],
  "total_tasks": 2
}
```

---

### 4. **Get Suggested Events**
- **Method**: `GET`
- **Endpoint**: `/api/getSuggestedEvents`
- **Description**: Get events that user hasn't RSVP'd to

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username |

**Example Request**:
```
GET /api/getSuggestedEvents?username=alaik
```

**Response**:
```json
{
  "success": true,
  "username": "alaik",
  "events": [
    {
      "event_id": "e-abc123",
      "name": "Calgary Tech Meetup",
      "organizer": "Tech Community",
      "about": "Monthly networking event for tech professionals",
      "venue": "Downtown Innovation Center",
      "date": "2025-11-15",
      "time": "6:00 PM",
      "rsvp_limit": 50,
      "rsvp_users": [],
      "tasks": [
        {
          "task_description": "Meet 2 people and exchange contact information",
          "completed": false
        }
      ]
    }
  ],
  "total_events": 1
}
```

---

### 5. **Get New Events (Scrape from Eventbrite)**
- **Method**: `GET`
- **Endpoint**: `/api/getNewEvents`
- **Description**: Scrape events from Eventbrite and save to database (auto-generates 3 tasks per event)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `location` | string | No | Calgary | City name |
| `radius` | string | No | 25km | Search radius |
| `max_results` | integer | No | 50 | Max events to scrape |

**Example Request**:
```
GET /api/getNewEvents?location=Toronto&radius=50km&max_results=100
```

**Response**:
```json
{
  "success": true,
  "location": "Toronto",
  "count": 45,
  "scraped": 45,
  "added": 38,
  "skipped": 7,
  "errors": 0,
  "events": [...]
}
```

**Notes**:
- Automatically generates 3 AI-powered tasks per event
- Prevents duplicate events from being added
- Tasks are tailored to each event's content

---

### 6. **Generate Admin Tasks**
- **Method**: `POST`
- **Endpoint**: `/api/GenerateAdminTasks`
- **Description**: Generate 10 personalized settling-in tasks based on user profile

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username |

**Example Request**:
```bash
curl -X POST http://localhost:8000/api/GenerateAdminTasks \
  -F "username=alaik"
```

**Response**:
```json
{
  "success": true,
  "response": [
    "- Open a bank account at TD or RBC",
    "- Apply for a Social Insurance Number (SIN)",
    "- Register for provincial health card",
    "- Find housing in your preferred neighborhood",
    "- Explore public transit routes to work",
    "- Visit local grocery stores and markets",
    "- Join community groups for your interests",
    "- Set up internet and utilities",
    "- Get a library card",
    "- Explore nearby parks and recreation centers"
  ],
  "tasks_added": 10,
  "total_tasks": 10,
  "message": "Tasks added successfully"
}
```

**Notes**:
- Uses Gemini AI to generate personalized tasks
- Based on user profile (age, interests, occupation, location, language)
- Automatically adds tasks to user's task list

---

### 7. **RSVP to Event**
- **Method**: `POST`
- **Endpoint**: `/api/rsvpEvent`
- **Description**: RSVP user to an event and add event tasks to their task list

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username |
| `event_name` | string | Yes | Event name to RSVP |

**Example Request**:
```bash
curl -X POST http://localhost:8000/api/rsvpEvent \
  -F "username=alaik" \
  -F "event_name=Calgary Tech Meetup"
```

**Response**:
```json
{
  "success": true,
  "message": "RSVP successful, event added to your list, and tasks added",
  "event_tasks": [
    {
      "task_description": "Meet 2 people at Calgary Tech Meetup",
      "completed": false
    },
    {
      "task_description": "Write a reflection about what you learned",
      "completed": false
    },
    {
      "task_description": "Share your key takeaway on social media",
      "completed": false
    }
  ],
  "tasks_added": 3,
  "total_tasks": 13,
  "event_added": true
}
```

**What Happens**:
1. Adds user to event's `rsvp_users` list
2. Adds event to user's `events_attending` list
3. Adds all event tasks to user's task list

---

### 8. **Check Task Completion (Image Verification)**
- **Method**: `POST`
- **Endpoint**: `/api/checkTaskCompletion`
- **Description**: Verify task completion using AI image analysis and auto-remove if completed

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username |
| `task_description` | string | Yes | Exact task description |
| `image` | file | Yes | Image file to verify |

**Example Request**:
```bash
curl -X POST http://localhost:8000/api/checkTaskCompletion \
  -F "username=alaik" \
  -F "task_description=Meet 2 people at Calgary Tech Meetup" \
  -F "image=@photo.jpg"
```

**Response (Task Completed)**:
```json
{
  "success": true,
  "task_completed": true,
  "task_removed": true,
  "response": "Yes, the image shows the user networking with multiple people at an event",
  "image_filename": "photo.jpg",
  "removal_details": {
    "success": true,
    "message": "Task removed successfully"
  }
}
```

**Response (Task Not Completed)**:
```json
{
  "success": true,
  "task_completed": false,
  "task_removed": false,
  "response": "No, the image does not show evidence of meeting people at an event",
  "image_filename": "photo.jpg"
}
```

**Notes**:
- Uses Gemini AI Vision to analyze images
- Automatically removes task from user's list if verified
- AI has lenient verification logic ("if it feels like they completed it")

---

## 🔑 **Key Features**

### Event Management
- **Auto-scraping**: Scrapes Eventbrite for upcoming events
- **Duplicate prevention**: Won't add same event twice
- **AI task generation**: Creates 3 custom tasks per event

### Task Management
- **Personalized tasks**: Generated based on user profile
- **Image verification**: AI-powered task completion checking
- **Auto-removal**: Completed tasks automatically deleted

### RSVP System
- **Bidirectional linking**: Updates both user and event records
- **Task integration**: Event tasks added to user on RSVP
- **Event tracking**: Users can see which events they're attending

---

## 🚀 **Quick Start**

1. **Start the server**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:8000/api/health
   ```

3. **Common workflow**:
   - Check username availability
   - Generate admin tasks for new user
   - Scrape events from Eventbrite
   - Get suggested events for user
   - User RSVPs to event (tasks auto-added)
   - User completes task with image verification
   - Task auto-removed from user's list

---

## ⚠️ **Error Responses**

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common HTTP status codes:
- `404`: User or event not found
- `400`: Bad request (invalid data)
- `500`: Internal server error

---

## 🗄️ **Database Tables**

### Users Table
- `username` (primary key)
- `tasks` (list of task objects)
- `events_attending` (list of event names)
- `dob`, `status`, `interests`, `location`, `language`, `occupation`

### Events Table
- `event_id` (primary key)
- `name`, `organizer`, `about`, `venue`, `date`, `time`
- `rsvp_users` (list of usernames)
- `tasks` (list of event tasks)
- `rsvp_limit`
