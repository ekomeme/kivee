import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import PlayerForm from '../components/PlayerForm.jsx';
import LoadingBar from './LoadingBar.jsx';
import { ROUTES } from '../config/routes';

export default function EditPlayerPage({ user, academy, db, membership }) {
  const navigate = useNavigate();
  const { playerId } = useParams();
  const [playerToEdit, setPlayerToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';

  useEffect(() => {
    if (!user || !db || !playerId || !academy || !membership) return;

    const fetchPlayer = async () => {
      setLoading(true);

      const userIsOwner = academy?.ownerId === user.uid;
      if (!userIsOwner && !['admin', 'member'].includes(membership?.role)) {
        setError(`You don't have permission to edit this ${studentLabelSingular.toLowerCase()}.`);
        setLoading(false);
        return;
      }

      try {
        const academyId = academy.id;
        const playerRef = doc(db, `academies/${academyId}/players`, playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const playerData = { id: playerSnap.id, ...playerSnap.data() };

          // Fetch tutor details if tutorId exists
          if (playerData.tutorId) {
            const tutorRef = doc(db, `academies/${academyId}/tutors`, playerData.tutorId);
            const tutorSnap = await getDoc(tutorRef);
            playerData.tutor = tutorSnap.exists() ? { id: tutorSnap.id, ...tutorSnap.data() } : null;
          }
          setPlayerToEdit(playerData);
        } else {
          setError(`${studentLabelSingular} not found.`);
        }
      } catch (err) {
        console.error("Error fetching player for edit:", err);
        setError("Failed to load student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [user, db, playerId, academy, membership, studentLabelSingular]);

  const handleComplete = () => {
    navigate(ROUTES.STUDENTS); // Go back to the students list after editing
  };

  if (loading) {
    return (
      <div className="section-container">
        <div className="section-content-wrapper">
          <LoadingBar loading={true} />
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-600">Loading student data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-container">
        <div className="section-content-wrapper">
          <div className="flex justify-center items-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="section-title">Edit {studentLabelSingular}</h2>
        </div>

        <div className="max-w-3xl">
          {playerToEdit && (
            <PlayerForm
              user={user}
              academy={academy}
              db={db}
              membership={membership}
              onComplete={handleComplete}
              playerToEdit={playerToEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
