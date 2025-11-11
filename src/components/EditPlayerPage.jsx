import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerForm from '../components/PlayerForm.jsx';

export default function EditPlayerPage({ user, academy, db, playerToEdit }) {
  const navigate = useNavigate();
  const handleComplete = () => {
    // Vuelve a la lista de estudiantes o a la ficha del estudiante
    navigate('/students');
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Edit Student</h2>
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