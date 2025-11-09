# Settlerr - Frontend

A modern, dark-themed web application to help newcomers, international students, and workers settle in Calgary, Canada.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
settlerr/
├── public/                 # Static files
│   └── index.html
├── src/
│   ├── assets/
│   │   └── styles/        # Global CSS variables and styles
│   ├── components/
│   │   └── common/        # Reusable UI components
│   ├── pages/             # Page components
│   │   ├── HomePage.js    # Landing page with Login/Signup buttons
│   │   ├── LoginPage.js   # Login form
│   │   └── SignupPage.js  # Multi-step signup (3 steps)
│   ├── App.js             # Main app component
│   ├── routes.js          # Route configuration
│   └── index.js           # App entry point
└── package.json
```

## 🎨 Features Implemented

### Pages
- **Home Page**: Landing page with app description and CTA buttons
- **Login Page**: Email and password input with validation
- **Signup Page**: 3-step registration process
  - Step 1: Account credentials
  - Step 2: Personal information
  - Step 3: Additional details (country, languages, interests)

### Components
- **Button**: Reusable button with multiple variants (primary, secondary, outline)
- **Input**: Form input with label, validation, and error states
- **Card**: Container component with consistent styling

### Styling
- Dark theme with modern design
- Consistent color scheme and spacing
- Responsive layout
- Smooth transitions and animations
- Custom form controls

## 🎯 Current Status

This is the **UI-only version** with:
- ✅ Navigation between pages
- ✅ Form inputs and validation UI
- ✅ Multi-step signup flow
- ❌ No backend integration (forms don't submit)
- ❌ No authentication logic

## 🔜 Next Steps

To make this functional, you'll need to:
1. Connect to your FastAPI backend
2. Implement authentication service
3. Add form submission handlers
4. Integrate AWS Cognito
5. Add remaining pages (Dashboard, Events, Network, Tasks, Account)

## 📝 Available Scripts

```bash
npm start       # Start development server
npm build       # Build for production
npm test        # Run tests
```

## 🛠️ Built With

- React 18
- Create React App
- React Router v6
- Pure CSS (no UI frameworks)

---

**Happy Coding! 🚀**