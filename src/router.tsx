import { createHashRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { App } from './App';
import { ClassificationEditor } from './pages/ClassificationEditor';
import { Counter } from './pages/Counter';
import { Classifications } from './pages/Classifications';
import { Home } from './pages/Home';
import { InstallGuide } from './pages/InstallGuide';
import { Recap } from './pages/Recap';
import { SessionWizard } from './pages/SessionWizard';
import { Settings } from './pages/Settings';

// Hash router: aman di GitHub Pages (refresh tidak 404).
const router = createHashRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sesi/baru', element: <SessionWizard /> },
      { path: 'sesi/:id/edit', element: <SessionWizard /> },
      { path: 'sesi/:id', element: <Counter /> },
      { path: 'sesi/:id/rekap', element: <Recap /> },
      { path: 'klasifikasi', element: <Classifications /> },
      { path: 'klasifikasi/:id', element: <ClassificationEditor /> },
      { path: 'pengaturan', element: <Settings /> },
      { path: 'panduan-install', element: <InstallGuide /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
