import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainPage } from "@/components/MainPage";

function App() {
  return (
    <WorkspaceProvider>
      <ProtectedRoute requireAdmin={true}>
        <MainPage />
      </ProtectedRoute>
    </WorkspaceProvider>
  );
}
export default App;