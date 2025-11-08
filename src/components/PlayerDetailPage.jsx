import React from 'react';
import PlayerDetail from '../components/PlayerDetail.jsx';
import { ArrowLeft, Edit } from 'lucide-react';

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
          <button onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md mr-2 flex items-center">
            <ArrowLeft className="mr-2 h-5 w-5" />
            <span>Back to list</span>
          </button>
          <button onClick={handleEdit} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            <span>Edit</span>
          </button>
        </div>
      </div>
      <PlayerDetail player={player} />
    </div>
  );
}