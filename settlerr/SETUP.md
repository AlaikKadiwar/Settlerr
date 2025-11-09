# Settlerr Setup Instructions

## ⚠️ Important: Network Path Issue

You're working on a network drive (UNC path), which can cause issues with npm installations.

## 🔧 Solution Options

### Option 1: Copy to Local Drive (Recommended)
```powershell
# Copy the project to your local drive
Copy-Item -Path "\\itfosfsp06\csusers\ayman.momin\Desktop\HTC\Settlerr\settlerr" -Destination "C:\Projects\settlerr" -Recurse

# Navigate to the local copy
cd C:\Projects\settlerr

# Install dependencies
npm install

# Start the development server
npm start
```

### Option 2: Map Network Drive
```powershell
# Map the network path to a drive letter
net use Z: \\itfosfsp06\csusers\ayman.momin\Desktop\HTC\Settlerr

# Navigate to the mapped drive
cd Z:\settlerr

# Install dependencies
npm install

# Start development server
npm start
```

### Option 3: Use Yarn Instead
```powershell
# Install Yarn globally (if not already installed)
npm install -g yarn

# Navigate to project
cd "\\itfosfsp06\csusers\ayman.momin\Desktop\HTC\Settlerr\settlerr"

# Install with Yarn
yarn install

# Start dev server
yarn start
```

## 📦 What Gets Installed

The project will install:
- React 18.2.0
- React DOM 18.2.0
- React Router DOM 6.20.0
- React Scripts 5.0.1

## 🚀 After Successful Installation

Once dependencies are installed, you can:

```bash
# Start development server (opens at http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📱 Testing the App

After running `npm start`, you should see:
1. **Home Page** at `http://localhost:3000/`
   - Two buttons: Login and Sign Up
   
2. **Login Page** at `http://localhost:3000/login`
   - Email and password fields
   - Can navigate back to home or to signup
   
3. **Signup Page** at `http://localhost:3000/signup`
   - 3-step registration process
   - Progress indicator showing current step
   - Can navigate between steps

## 🎨 What You'll See

- Modern dark theme
- Smooth animations
- Responsive design
- Working navigation between pages
- Form inputs with validation styling

## ⚠️ Known Limitations (By Design)

- Forms don't actually submit (no backend yet)
- No data persistence
- No authentication logic
- Alert messages on form submission

## 🔜 Ready for Backend Integration

Once your teammate completes the FastAPI backend, you can:
1. Update `src/services/api.js` with backend URL
2. Implement actual form submission in `authService.js`
3. Add authentication context
4. Connect to AWS Cognito

---

**Need Help?** Check `IMPLEMENTATION_SUMMARY.md` for complete details.
