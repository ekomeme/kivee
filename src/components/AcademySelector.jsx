import React, { useState, useEffect, useRef } from 'react';

/**
 * Academy Selector Component
 * Allows users to switch between multiple academies
 *
 * @param {Object} props
 * @param {Array} props.availableAcademies - List of academies user has access to
 * @param {Object} props.currentAcademy - Currently selected academy
 * @param {Function} props.onSwitch - Callback when academy is switched
 */
const AcademySelector = ({ availableAcademies, currentAcademy, onSwitch }) => {
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

  // Don't show if user has 0 or 1 academy
  if (!availableAcademies || availableAcademies.length <= 1) {
    return null;
  }

  const handleAcademyClick = (academyId) => {
    onSwitch(academyId);
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium"
        title="Switch Academy"
        aria-label="Switch Academy"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <span className="truncate max-w-[150px]">
          {currentAcademy?.name || 'Select Academy'}
        </span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-section border border-gray-200 rounded-lg shadow-lg z-50 py-2">
          <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
            Your Academies
          </div>

          {availableAcademies.map((academy) => {
            const isSelected = currentAcademy?.id === academy.id;

            return (
              <button
                key={academy.id}
                onClick={() => handleAcademyClick(academy.id)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between transition ${
                  isSelected ? 'bg-primary/10' : ''
                }`}
                aria-label={`Switch to ${academy.name}`}
                aria-current={isSelected ? 'true' : 'false'}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {academy.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {academy.userRole}
                  </p>
                </div>

                {isSelected && (
                  <svg
                    className="w-5 h-5 text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AcademySelector;
