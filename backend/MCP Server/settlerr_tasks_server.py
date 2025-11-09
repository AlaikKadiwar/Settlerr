import httpx
from fastmcp import FastMCP

# Configuration
API_BASE_URL = "http://localhost:8000"

# Initialize FastMCP server
mcp = FastMCP("settlerr-tasks")


@mcp.tool()
async def get_user_tasks(username: str) -> str:
    """
    Get all tasks assigned to a user. Returns settling-in tasks and event tasks.
    
    Args:
        username: Username to get tasks for (e.g., 'alaik')
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/getUserTasks",
                params={"username": username},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    tasks = data.get("tasks", [])
                    total = data.get("total_tasks", 0)
                    
                    # Format tasks nicely
                    if tasks:
                        task_list = "\n".join([
                            f"{i+1}. {task.get('task_description', 'No description')} "
                            f"[{'✓ Completed' if task.get('completed') else '○ Pending'}]"
                            for i, task in enumerate(tasks)
                        ])
                        
                        return f"📋 Tasks for {username} ({total} total):\n\n{task_list}"
                    else:
                        return f"✓ No tasks found for {username}. Generate some settling tasks to get started!"
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ User '{username}' not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def generate_admin_tasks(username: str) -> str:
    """
    Generate 10 personalized settling-in tasks for a new settler based on their profile.
    Tasks are tailored to age, interests, occupation, status, location, and language.
    
    Args:
        username: Username to generate tasks for
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/GenerateAdminTasks",
                data={"username": username},
                timeout=30.0  # Longer timeout for AI generation
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    tasks = data.get("response", [])
                    tasks_added = data.get("tasks_added", 0)
                    total_tasks = data.get("total_tasks", 0)
                    
                    task_list = "\n".join(tasks)
                    
                    return f"""✅ Generated {tasks_added} personalized settling-in tasks for {username}!
Total tasks now: {total_tasks}

📝 New Tasks:
{task_list}

These tasks are tailored to your profile (interests, occupation, status, location)."""
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ User '{username}' not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def check_task_completion(username: str, task_description: str, image_path: str) -> str:
    """
    Verify task completion using image analysis and automatically remove completed tasks.
    
    Args:
        username: Username
        task_description: Exact task description to verify
        image_path: Path to image file to verify task completion
    """
    async with httpx.AsyncClient() as client:
        try:
            # Read image file
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Send request
            response = await client.post(
                f"{API_BASE_URL}/api/checkTaskCompletion",
                data={
                    "username": username,
                    "task_description": task_description
                },
                files={"image": (image_path.split("/")[-1], image_data)},
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    task_completed = data.get("task_completed", False)
                    task_removed = data.get("task_removed", False)
                    reasoning = data.get("response", "")
                    
                    if task_completed and task_removed:
                        return f"""✅ Task Completed!

Task: {task_description}
Status: ✓ Verified and removed from your task list

AI Analysis: {reasoning}"""
                    elif task_completed and not task_removed:
                        return f"""⚠️ Task verified but not removed

Task: {task_description}
AI Analysis: {reasoning}

The task appears complete but couldn't be removed from your list."""
                    else:
                        return f"""❌ Task Not Complete

Task: {task_description}

AI Analysis: {reasoning}

Please try again with better evidence of completion."""
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except FileNotFoundError:
            return f"❌ Error: Image file not found at '{image_path}'"
        except Exception as e:
            return f"❌ Error: {str(e)}"


if __name__ == "__main__":
    mcp.run()
