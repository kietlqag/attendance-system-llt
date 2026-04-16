import { createBrowserRouter } from "react-router";
import { AdminLayout } from "./components/admin/AdminLayout";
import { UserLayout } from "./components/user/UserLayout";
import { LoginPage } from "./components/LoginPage";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { CreateSession } from "./components/admin/CreateSession";
import { SessionDetail } from "./components/admin/SessionDetail";
import { SessionManagement } from "./components/admin/SessionManagement";
import { GroupManagement } from "./components/admin/GroupManagement";
import { CreateGroup } from "./components/admin/CreateGroup";
import { GroupDetail } from "./components/admin/GroupDetail";
import { UserManagement } from "./components/admin/UserManagement";
import { UserDashboard } from "./components/user/UserDashboard";
import { ScanQR } from "./components/user/ScanQR";
import { UserHistory } from "./components/user/UserHistory";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "users",
        element: <UserManagement />,
      },
      {
        path: "sessions",
        element: <SessionManagement />,
      },
      {
        path: "create-session",
        element: <CreateSession />,
      },
      {
        path: "session/:sessionId",
        element: <SessionDetail />,
      },
      {
        path: "groups",
        element: <GroupManagement />,
      },
      {
        path: "groups/create",
        element: <CreateGroup />,
      },
      {
        path: "groups/:groupId",
        element: <GroupDetail />,
      },
    ],
  },
  {
    path: "/user",
    element: <UserLayout />,
    children: [
      {
        index: true,
        element: <UserDashboard />,
      },
      {
        path: "scan",
        element: <ScanQR />,
      },
      {
        path: "history",
        element: <UserHistory />,
      },
    ],
  },
]);