// src/components/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white shadow-lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold">PageDAO Hub</h2>
        <p className="text-gray-400 text-sm mt-1">Token Analytics Dashboard</p>
      </div>
      <nav className="mt-6">
        <ul>
          <li>
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
              end
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </span>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/token/ethereum" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </span>
              Ethereum $PAGE
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/token/optimism" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </span>
              Optimism $PAGE
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/token/base" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </span>
              Base $PAGE
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/token/osmosis" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </span>
              Osmosis $PAGE
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/tvl" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </span>
              TVL Analytics
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/networks" 
              className={({ isActive }) => 
                `flex items-center py-3 px-6 hover:bg-gray-700 ${isActive ? 'bg-gray-700' : ''}`
              }
            >
              <span className="mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </span>
              Network Comparison
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
