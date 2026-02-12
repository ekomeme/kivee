import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PlayerForm from './PlayerForm.jsx';

export default function NewPlayerPage({ user, academy, db, membership }) {
  const navigate = useNavigate();
  const handlePlayerAdded = () => {
    navigate('/students'); // Navigate back to the students list after adding
  };
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';

  return (
    <div className="section-container">
      <div className="section-content-wrapper">
        <div className="mb-6">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Students
          </button>
          <h2 className="section-title">Add New {studentLabelSingular}</h2>
        </div>

        <div className="max-w-3xl">
          <PlayerForm
            user={user}
            academy={academy}
            db={db}
            membership={membership}
            onComplete={handlePlayerAdded}
          />
        </div>
      </div>
    </div>
  );
}
