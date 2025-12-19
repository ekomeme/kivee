import React, { useState, useEffect, useRef } from 'react';
import { LogOut, ChevronsUpDown } from 'lucide-react';

/**
 * User Menu Component
 * Displays user profile and sign out option
 *
 * @param {Object} props
 * @param {Object} props.user - Firebase user object
 * @param {Function} props.onSignOut - Callback when user clicks sign out
 * @param {boolean} props.isSidebar - Whether this is rendered in the sidebar (uses different styles)
 */
const UserMenu = ({ user, onSignOut, isSidebar = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Get user's first initial for avatar
  const getUserInitial = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const handleSignOut = () => {
    setShowMenu(false);
    onSignOut();
  };

  return (
    <div
      className={isSidebar ? 'sidebar__user-menu' : 'relative'}
      ref={menuRef}
    >
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={
          isSidebar
            ? 'sidebar__user-button'
            : 'flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100'
        }
        aria-label="User menu"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <div
          className={
            isSidebar
              ? 'sidebar__user-avatar'
              : 'w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center'
          }
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User Avatar'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-gray-700">
              {getUserInitial()}
            </span>
          )}
        </div>

        {isSidebar ? (
          <span className="sidebar__user-name">
            {user.displayName || user.email}
          </span>
        ) : (
          <span className="font-medium truncate hidden md:block">
            {user.displayName || user.email}
          </span>
        )}

        {isSidebar && <ChevronsUpDown className="sidebar__chevron" />}
      </button>

      {showMenu && (
        <div
          className={
            isSidebar
              ? 'sidebar__user-menu-dropdown'
              : 'absolute top-full right-0 mt-2 w-64 bg-section border border-gray-200 rounded-lg shadow-lg z-10 p-4'
          }
        >
          <p
            className={
              isSidebar
                ? 'sidebar__user-menu-name'
                : 'text-sm font-bold truncate'
            }
          >
            {user.displayName}
          </p>
          <p
            className={
              isSidebar
                ? 'sidebar__user-menu-email'
                : 'text-xs text-gray-500 truncate mb-3'
            }
          >
            {user.email}
          </p>

          <hr
            className={isSidebar ? 'sidebar__user-menu-divider' : 'my-2'}
          />

          <button
            onClick={handleSignOut}
            className={
              isSidebar
                ? 'sidebar__user-menu-signout'
                : 'w-full text-left text-red-600 hover:bg-red-50 rounded-md px-3 py-2 flex items-center'
            }
          >
            <LogOut className={isSidebar ? 'sidebar__icon' : 'mr-2 h-4 w-4'} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
