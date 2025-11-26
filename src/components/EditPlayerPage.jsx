import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import PlayerForm from '../components/PlayerForm.jsx';

export default function EditPlayerPage({ user, academy, db }) {
  const navigate = useNavigate();
  const { playerId } = useParams();
  const [playerToEdit, setPlayerToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !db || !playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const playerRef = doc(db, `academies/${user.uid}/players`, playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const playerData = { id: playerSnap.id, ...playerSnap.data() };

          // Fetch tutor details if tutorId exists
          if (playerData.tutorId) {
            const tutorRef = doc(db, `academies/${user.uid}/tutors`, playerData.tutorId);
            const tutorSnap = await getDoc(tutorRef);
            playerData.tutor = tutorSnap.exists() ? { id: tutorSnap.id, ...tutorSnap.data() } : null;
          }
          setPlayerToEdit(playerData);
        } else {
          setError("Student not found.");
        }
      } catch (err) {
        console.error("Error fetching player for edit:", err);
        setError("Failed to load student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [user, db, playerId]);

  const handleComplete = () => {
    // Vuelve a la lista de estudiantes o a la ficha del estudiante
    navigate(`/students/${playerId}`); // Go back to the detail page after editing
  };

  if (loading) return <div className="text-center p-10">Loading student for editing...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Edit Student</h2>
      {playerToEdit && (
        <PlayerForm
          user={user}
          academy={academy}
          db={db}
          onComplete={handleComplete}
          playerToEdit={playerToEdit}
        />
      )}
    </div>
  );
}
