import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TasksPage from "./pages/TasksPage";
import EventsPage from "./pages/EventsPage";
import MyNetworkPage from "./pages/MyNetworkPage";
import MyAccountPage from "./pages/MyAccountPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/network" element={<MyNetworkPage />} />
      <Route path="/account" element={<MyAccountPage />} />
    </Routes>
  );
};

export default AppRoutes;
