import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Layers, Tags, CreditCard, Settings, ChevronsUpDown } from 'lucide-react';
import logoKivee from '../assets/logo-kivee.svg';
import './Sidebar.css';

const AcademySelector = ({ availableAcademies, currentAcademy, onSwitch, academy }) => {
  const menuRef = useRef(null);
  const [showMenu, setShowMenu] = React.useState(false);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasMultipleAcademies = availableAcademies && availableAcademies.length > 1;

  return (
    <div className="sidebar__academy-selector" ref={menuRef}>
      <button
        onClick={() => hasMultipleAcademies && setShowMenu(!showMenu)}
        className="sidebar__header-button"
        title={hasMultipleAcademies ? "Cambiar academia" : academy.name}
        disabled={!hasMultipleAcademies}
      >
        <div className="sidebar__logo">
          {academy.logoUrl ? (
            <img src={academy.logoUrl} alt="Academy logo" />
          ) : (
            <span>{academy.name?.charAt(0) || '?'}</span>
          )}
        </div>
        <h2 className="sidebar__academy-name">{currentAcademy?.name || academy.name}</h2>
        {hasMultipleAcademies && <ChevronsUpDown className="sidebar__chevron" />}
      </button>
      {showMenu && hasMultipleAcademies && (
        <div className="sidebar__academy-menu">
          <div className="sidebar__academy-menu-header">Tus academias</div>
          {availableAcademies.map((academyItem) => (
            <button
              key={academyItem.id}
              onClick={() => {
                onSwitch(academyItem.id);
                setShowMenu(false);
              }}
              className={`sidebar__academy-item ${currentAcademy?.id === academyItem.id ? 'is-active' : ''}`}
            >
              <div className="sidebar__academy-item-body">
                <p className="sidebar__academy-item-name">{academyItem.name}</p>
                <p className="sidebar__academy-item-role">{academyItem.userRole}</p>
              </div>
              {currentAcademy?.id === academyItem.id && <span className="sidebar__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Sidebar({
  academy,
  availableAcademies,
  onSwitchAcademy,
  studentLabelPlural,
  pendingInvites,
  onNavigate,
  userMenu,
  showHeader = true,
  className = "",
}) {
  return (
    <div className={`sidebar ${className}`}>
      {/* Logo de Kivee */}
      <div className="sidebar__kivee-logo">
        <img src={logoKivee} alt="Kivee Logo" />
      </div>

      {showHeader && (
        <AcademySelector
          availableAcademies={availableAcademies}
          currentAcademy={academy}
          onSwitch={onSwitchAcademy}
          academy={academy}
        />
      )}

      <nav className="sidebar__nav">
        <ul>
          <li>
            <NavLink
              to="/"
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <Home className="sidebar__icon" />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/students"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <Users className="sidebar__icon" />
              <span>{studentLabelPlural}</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/groups"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <Layers className="sidebar__icon" />
              <span>Groups & Classes</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/plans"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <Tags className="sidebar__icon" />
              <span>Plans & Offers</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/payments"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <CreditCard className="sidebar__icon" />
              <span>Payments</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'is-active' : ''}`
              }
            >
              <Settings className="sidebar__icon" />
              <span>Settings</span>
              {pendingInvites.length > 0 && (
                <span className="sidebar__badge">{pendingInvites.length}</span>
              )}
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar__footer">
        {userMenu}
      </div>
    </div>
  );
}
