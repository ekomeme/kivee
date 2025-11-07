import React from 'react';
import PlayerDetail from '../components/PlayerDetail.jsx';

export default function PlayerDetailPage({ player, setActiveSection, setSelectedPlayer }) {
  const handleEdit = () => {
    setActiveSection('editStudent');
  };

  const handleBack = () => {
    setActiveSection('students');
    setSelectedPlayer(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Student Sheet</h2>
        <div>
          <button onClick={handleBack} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md mr-2">Back to list</button>
          <button onClick={handleEdit} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Edit</button>
        </div>
      </div>
      <PlayerDetail player={player} />
    </div>
  );
}