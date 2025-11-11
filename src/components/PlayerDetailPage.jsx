import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import PlayerDetail from '../components/PlayerDetail.jsx';
import { ArrowLeft, Edit } from 'lucide-react';

export default function PlayerDetailPage({ user, academy, db }) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!user || !db || !playerId) return;
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

          // Fetch tier name if tierId exists
          if (playerData.tierId) {
            const tierRef = doc(db, `academies/${user.uid}/tiers`, playerData.tierId);
            const tierSnap = await getDoc(tierRef);
            playerData.tierName = tierSnap.exists() ? tierSnap.data().name : 'N/A';
          }

          setPlayer(playerData);
        }
      } catch (error) {
        console.error("Error fetching player details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerDetails();
  }, [user, db, playerId]);

  const handleEdit = () => {
    navigate(`/students/${playerId}/edit`);
  };

  if (loading) {
    return <div className="text-center p-10">Loading student details...</div>;
  }

  if (!player) {
    return <div className="text-center p-10">Student not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="text-xl font-semibold text-gray-800">
          <Link to="/students" className="text-primary hover:underline">Students</Link>
          <span className="text-gray-500 mx-2">&gt;</span>
          <span className="text-gray-800">{player.name} {player.lastName}</span>
        </div>
        <div>
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