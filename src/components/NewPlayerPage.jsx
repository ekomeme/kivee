import React from 'react';
import PlayerForm from './PlayerForm.jsx';

export default function NewPlayerPage({ user, academy, db, setActiveSection }) {
  const handlePlayerAdded = () => {
    setActiveSection('students'); // Navigate back to the students list after adding
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Add New Student</h2>
      <PlayerForm
        user={user}
        academy={academy}
        db={db}
        onComplete={handlePlayerAdded}
      />
    </div>
  );
}