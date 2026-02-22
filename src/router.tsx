import { Navigate, Route, Routes } from "react-router";
import { GlobalAgentDetailPage } from "./routes/global/agents/$agentName.js";
import { GlobalAgentsPage } from "./routes/global/agents/index.js";
import { GlobalAgentsOutlet } from "./routes/global/agents/route.js";
import { GlobalCommandDetailPage } from "./routes/global/commands/$folder.$commandName.js";
import { GlobalCommandsPage } from "./routes/global/commands/index.js";
import { GlobalCommandsOutlet } from "./routes/global/commands/route.js";
import { GlobalFeaturesPage } from "./routes/global/features.js";
import { GlobalHooksPage } from "./routes/global/hooks.js";
// Global routes
import { GlobalOverviewPage } from "./routes/global/index.js";
import { GlobalInstructionsPage } from "./routes/global/instructions.js";
import { GlobalPluginsPage } from "./routes/global/plugins.js";
import { GlobalSettingsPage } from "./routes/global/settings.js";
import { GlobalSkillDetailPage } from "./routes/global/skills/$skillName.js";
import { GlobalSkillsPage } from "./routes/global/skills/index.js";
import { GlobalSkillsOutlet } from "./routes/global/skills/route.js";
import { HistoryPage } from "./routes/history.js";
// Route page components (exported after migration)
import { DashboardPage } from "./routes/index.js";
import { LoginPage } from "./routes/login.js";
import { ProjectAgentDetailPage } from "./routes/projects/$projectId/agents/$agentName.js";
import { ProjectAgentsPage } from "./routes/projects/$projectId/agents/index.js";
import { ProjectAgentsOutlet } from "./routes/projects/$projectId/agents/route.js";
import { ProjectCommandDetailPage } from "./routes/projects/$projectId/commands/$folder.$commandName.js";
import { ProjectCommandsPage } from "./routes/projects/$projectId/commands/index.js";
import { ProjectCommandsOutlet } from "./routes/projects/$projectId/commands/route.js";
import { ProjectInstructionsPage } from "./routes/projects/$projectId/instructions.js";
import { ProjectMemoryDetailPage } from "./routes/projects/$projectId/memory/$filename.js";
import { ProjectMemoryListPage } from "./routes/projects/$projectId/memory/index.js";
import { ProjectLayout } from "./routes/projects/$projectId/route.js";
import { ProjectSettingsPage } from "./routes/projects/$projectId/settings.js";
import { ProjectSkillDetailPage } from "./routes/projects/$projectId/skills/$skillName.js";
import { ProjectSkillsPage } from "./routes/projects/$projectId/skills/index.js";
import { ProjectSkillsOutlet } from "./routes/projects/$projectId/skills/route.js";
// Projects routes
import { ProjectsListPage } from "./routes/projects/index.js";
import { SetupPage } from "./routes/setup.js";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/history" element={<HistoryPage />} />

      {/* Global routes */}
      <Route path="/global" element={<GlobalOverviewPage />} />
      <Route path="/global/settings" element={<GlobalSettingsPage />} />

      <Route path="/global/agents" element={<GlobalAgentsOutlet />}>
        <Route index element={<GlobalAgentsPage />} />
        <Route path=":agentName" element={<GlobalAgentDetailPage />} />
      </Route>

      <Route path="/global/commands" element={<GlobalCommandsOutlet />}>
        <Route index element={<GlobalCommandsPage />} />
        <Route path=":folder/:commandName" element={<GlobalCommandDetailPage />} />
      </Route>

      <Route path="/global/skills" element={<GlobalSkillsOutlet />}>
        <Route index element={<GlobalSkillsPage />} />
        <Route path=":skillName" element={<GlobalSkillDetailPage />} />
      </Route>

      <Route path="/global/hooks" element={<GlobalHooksPage />} />
      <Route path="/global/features" element={<GlobalFeaturesPage />} />
      <Route path="/global/plugins" element={<GlobalPluginsPage />} />
      <Route path="/global/instructions" element={<GlobalInstructionsPage />} />

      {/* Projects routes */}
      <Route path="/projects" element={<ProjectsListPage />} />

      <Route path="/projects/:projectId" element={<ProjectLayout />}>
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<ProjectSettingsPage />} />

        <Route path="agents" element={<ProjectAgentsOutlet />}>
          <Route index element={<ProjectAgentsPage />} />
          <Route path=":agentName" element={<ProjectAgentDetailPage />} />
        </Route>

        <Route path="commands" element={<ProjectCommandsOutlet />}>
          <Route index element={<ProjectCommandsPage />} />
          <Route path=":folder/:commandName" element={<ProjectCommandDetailPage />} />
        </Route>

        <Route path="skills" element={<ProjectSkillsOutlet />}>
          <Route index element={<ProjectSkillsPage />} />
          <Route path=":skillName" element={<ProjectSkillDetailPage />} />
        </Route>

        <Route path="instructions" element={<ProjectInstructionsPage />} />
        <Route path="memory" element={<ProjectMemoryListPage />} />
        <Route path="memory/:filename" element={<ProjectMemoryDetailPage />} />
      </Route>
    </Routes>
  );
}
