import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Calendar, User, LogOut, Bell, Settings } from 'lucide-react';

function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      <div className="flex flex-col items-center w-full">
        <NavLink to="/chat" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
          <MessageSquare size={24} />
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `sidebar-icon ${isActive ? 'active' : ''}`}>
          <Calendar size={24} />
        </NavLink>
        <div className="sidebar-icon">
          <Bell size={24} />
        </div>
        <div className="sidebar-icon">
          <Settings size={24} />
        </div>
      </div>
      
      <div className="mt-auto flex flex-col items-center w-full" style={{marginTop: 'auto'}}>
        <div className="sidebar-icon" onClick={onLogout} title="Logout">
          <LogOut size={24} />
        </div>
        <div className="sidebar-icon">
          <User size={24} />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
