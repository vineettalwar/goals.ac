import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/studio" element={<Navigate to="/projects" replace />} />
        <Route path="/strategy/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/search/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/research/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/audit/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/content-piece/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/content-pieces/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/integrations" element={<Navigate to="/settings" replace />} />
        <Route path="/partner" element={<Navigate to="/dashboard" replace />} />
        <Route path="/growth-roadmaps/*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
