import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerForm from './PlayerForm.jsx';

export default function NewPlayerPage({ user, academy, db }) {
  const navigate = useNavigate();
  const handlePlayerAdded = () => {
    navigate('/students'); // Navigate back to the students list after adding
  };
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Add New {studentLabelSingular}</h2>
      <PlayerForm
        user={user}
        academy={academy}
        db={db}
        onComplete={handlePlayerAdded}
      />
    </div>
  );
}
