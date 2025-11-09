# Tasks Page - JSON Integration Guide

## Current Setup

The tasks page currently uses demo data defined in `TasksPage.js`. This data is temporary and can be easily replaced with a JSON file or API endpoint.

## How to Replace with JSON File

### Step 1: Create your tasks JSON file

Create a file at `src/data/tasks.json` with this structure:

```json
{
  "individual": [
    {
      "id": 1,
      "title": "Task title",
      "description": "Task description",
      "completed": false,
      "imageRequired": true,
      "uploadedImage": null
    }
  ],
  "grouped": [
    {
      "id": 101,
      "title": "Task title",
      "description": "Task description",
      "type": "person",
      "targetImage": "URL_to_image",
      "location": "Optional location text",
      "completed": false,
      "imageRequired": true,
      "uploadedImage": null
    }
  ]
}
```

### Step 2: Update TasksPage.js

Replace this line:
```javascript
// Demo tasks data - Replace this with JSON file import later
// TODO: Replace with: import tasksData from './data/tasks.json';
const DEMO_TASKS = { ... };
```

With:
```javascript
import tasksData from '../data/tasks.json';
const DEMO_TASKS = tasksData;
```

That's it! The app will now use your JSON file.

## How to Replace with API

### Step 1: Create an API service

In `src/services/taskService.js`:

```javascript
export const fetchTasks = async () => {
  try {
    const response = await fetch('YOUR_API_ENDPOINT/tasks');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return null;
  }
};
```

### Step 2: Update TasksPage.js

Replace the state initialization:

```javascript
// Current:
const [individualTasks, setIndividualTasks] = useState(() => {
  const saved = localStorage.getItem('individualTasks');
  return saved ? JSON.parse(saved) : DEMO_TASKS.individual;
});

// Replace with:
const [individualTasks, setIndividualTasks] = useState([]);

useEffect(() => {
  const loadTasks = async () => {
    const saved = localStorage.getItem('individualTasks');
    if (saved) {
      setIndividualTasks(JSON.parse(saved));
    } else {
      const data = await fetchTasks();
      if (data) {
        setIndividualTasks(data.individual);
        setGroupedTasks(data.grouped);
      }
    }
  };
  loadTasks();
}, []);
```

## Task Data Structure

### Individual Tasks
- `id`: Unique identifier (number)
- `title`: Task name (string)
- `description`: Task description (string)
- `completed`: Completion status (boolean)
- `imageRequired`: Whether image upload is required (boolean)
- `uploadedImage`: Base64 image data or null (string | null)

### Grouped Tasks (Networking/Location Tasks)
All fields from Individual Tasks, plus:
- `type`: "person" or "location" (string)
- `targetImage`: URL to target image (string)
- `location`: Location description or null (string | null)

## Features

- ✅ Image upload required to complete tasks
- ✅ Progress tracking (percentage complete)
- ✅ Tasks saved to localStorage
- ✅ Separate sections for individual and grouped tasks
- ✅ Visual completion badges
- ✅ Target images for networking/location tasks
- ✅ Responsive grid layout

## Notes

- Images are stored as base64 in localStorage
- For production, upload images to cloud storage (S3, Cloudinary, etc.)
- Consider implementing image compression before upload
- Task completion state persists across sessions via localStorage
