import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import CalendarPage from './pages/CalendarPage';
import FillInvite from './pages/FillInvite';
import GroupPage from './pages/GroupPage';
import GroupSettings from './pages/GroupSettings';
import Home from './pages/Home';
import NewHangout from './pages/NewHangout';
import Profile from './pages/Profile';


/** Pages with the bottom tab bar. */
function TabLayout() {
  const tab = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);
  return (
    <>
      <main className="screen">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/calendar" className={tab}>
          <span aria-hidden="true">🗓️</span>
          Calendar
        </NavLink>
        <NavLink to="/" end className={tab}>
          <span aria-hidden="true">🏠</span>
          Groups
        </NavLink>
        <NavLink to="/profile" className={tab}>
          <span aria-hidden="true">👤</span>
          Profile
        </NavLink>
      </nav>
    </>
  );
}

/** Full-screen pages (group, settings, forms) with a back button instead of tabs. */
function PlainLayout() {
  return (
    <main className="screen">
      <Outlet />
    </main>
  );
}

export default function App() {
  return (
    <div className="shell">
      <div className="app">
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route element={<PlainLayout />}>
            <Route path="/group/:id" element={<GroupPage />} />
            <Route path="/group/:id/settings" element={<GroupSettings />} />
            <Route path="/hangout/new/:groupId" element={<NewHangout />} />
            <Route path="/invite/:id" element={<FillInvite />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
