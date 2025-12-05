import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Layers, Tags, CreditCard, Settings } from 'lucide-react';
import './Sidebar.css';

const AcademySelector = ({ availableAcademies, currentAcademy, onSwitch }) => {
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

  if (!availableAcademies || availableAcademies.length <= 1) return null;

  return (
    <div className="sidebar__academy-selector" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="sidebar__academy-trigger"
        title="Cambiar academia"
      >
        <span className="sidebar__academy-name">{currentAcademy?.name || 'Seleccionar academia'}</span>
        <span className="sidebar__chevron">▾</span>
      </button>
      {showMenu && (
        <div className="sidebar__academy-menu">
          <div className="sidebar__academy-menu-header">Tus academias</div>
          {availableAcademies.map((academy) => (
            <button
              key={academy.id}
              onClick={() => {
                onSwitch(academy.id);
                setShowMenu(false);
              }}
              className={`sidebar__academy-item ${currentAcademy?.id === academy.id ? 'is-active' : ''}`}
            >
              <div className="sidebar__academy-item-body">
                <p className="sidebar__academy-item-name">{academy.name}</p>
                <p className="sidebar__academy-item-role">{academy.userRole}</p>
              </div>
              {currentAcademy?.id === academy.id && <span className="sidebar__check">✓</span>}
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
      {showHeader && (
        <div className="sidebar__header">
          <div className="sidebar__logo">
            {academy.logoUrl ? (
              <img src={academy.logoUrl} alt="Academy logo" />
            ) : (
              <span>{academy.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div className="sidebar__title">
            {availableAcademies.length <= 1 ? (
              <h2 title={academy.name}>{academy.name}</h2>
            ) : (
              <AcademySelector
                availableAcademies={availableAcademies}
                currentAcademy={academy}
                onSwitch={onSwitchAcademy}
              />
            )}
          </div>
        </div>
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
