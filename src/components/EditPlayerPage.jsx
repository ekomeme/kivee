import React from 'react';
import PlayerForm from '../components/PlayerForm.jsx';

export default function EditPlayerPage({ user, academy, db, playerToEdit, setActiveSection }) {
  const handleComplete = () => {
    // Vuelve a la lista de jugadores o a la ficha del jugador
    setActiveSection('players');
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Editar Jugador</h2>
      <PlayerForm
        user={user}
        academy={academy}
        db={db}
        onComplete={handleComplete}
        playerToEdit={playerToEdit}
      />
    </div>
  );
}