import React from 'react';
import PlayerForm from './PlayerForm.jsx';

export default function NewPlayerPage({ user, academy, db, setActiveSection }) {
  const handlePlayerAdded = () => {
    setActiveSection('players'); // Navigate back to the players list after adding
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Agregar Nuevo Jugador</h2>
      <PlayerForm
        user={user}
        academy={academy}
        db={db}
        onComplete={handlePlayerAdded}
      />
    </div>
  );
}