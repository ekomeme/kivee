import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import PlayerForm from './PlayerForm.jsx';

export default function PlayersSection({ user, academy, db, setActiveSection }) { // Receive setActiveSection
  const [players, setPlayers] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false); // State for edit modal
  const [editingPlayer, setEditingPlayer] = useState(null); // Player data for editing
  const [showTutorTooltip, setShowTutorTooltip] = useState(false);
  const [tooltipTutorData, setTooltipTutorData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tiers, setTiers] = useState([]);

  // Fetches players and their tutors
  const fetchPlayers = async () => {
    if (!user || !academy) return;

    // Fetch Tiers
    const tiersRef = collection(db, `academies/${user.uid}/tiers`);
    const tiersSnapshot = await getDocs(tiersRef);
    const tiersData = tiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const tiersMap = new Map(tiersData.map(tier => [tier.id, tier.name]));
    setTiers(tiersData);

    // Fetch Players
    const playersRef = collection(db, `academies/${user.uid}/players`);
    const q = query(playersRef);
    const querySnapshot = await getDocs(q);
    const playersData = await Promise.all(querySnapshot.docs.map(async playerDoc => {
      const player = { id: playerDoc.id, ...playerDoc.data() };
      if (player.tutorId) {
        const tutorRef = doc(db, `academies/${user.uid}/tutors`, player.tutorId);
        const tutorSnap = await getDoc(tutorRef);
        player.tutor = tutorSnap.exists() ? { id: tutorSnap.id, ...tutorSnap.data() } : null;
      }
      if (player.birthday) {
        const birthDate = new Date(player.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        player.age = age;
      }
      if (player.tierId) {
        player.tierName = tiersMap.get(player.tierId) || 'N/A';
      }
      return player;
    }));
    setPlayers(playersData);
  };

  useEffect(() => {
    fetchPlayers();
  }, [user, academy, db]); // Add db to dependencies

  const handleAddPlayer = () => {
    setActiveSection('newPlayer'); // Navigate to the new player creation page
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setShowEditModal(true); // Show modal for editing
  };

  const handleDeletePlayer = async (playerId) => {
    // Confirmation before deleting
    if (window.confirm("¿Estás seguro de que quieres eliminar este jugador?")) {
      try {
        await deleteDoc(doc(db, `academies/${user.uid}/players`, playerId));
        fetchPlayers(); // Refresca la lista
        alert("Jugador eliminado con éxito.");
      } catch (error) {
        console.error("Error al eliminar jugador:", error);
        alert("Error al eliminar jugador.");
      }
    }
  };

  const handleTutorClick = (tutor, event) => {
    setTooltipTutorData(tutor);
    // Get position of the clicked element to position the tooltip relative to it
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left,
      y: rect.bottom + 5, // Position below the clicked element, with a small offset
    });
    setShowTutorTooltip(true);
  };

  const closeTutorTooltip = () => {
    setShowTutorTooltip(false);
    setTooltipTutorData(null);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Header with title and Add Player button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Jugadores de {academy.name}</h2>
        <button
          onClick={handleAddPlayer}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
        >
          Agregar Nuevo Jugador
        </button>
      </div>
      {players.length === 0 ? (
        <p className="text-gray-600">No hay jugadores registrados aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Foto</th>
                <th className="py-2 px-4 border-b text-left">Nombre</th>
                <th className="py-2 px-4 border-b text-left">Género</th>
                <th className="py-2 px-4 border-b text-left">Email Jugador</th>
                <th className="py-2 px-4 border-b text-left">Teléfono Jugador</th>
                <th className="py-2 px-4 border-b text-left">Categoría</th>
                <th className="py-2 px-4 border-b text-left">Plan</th>
                <th className="py-2 px-4 border-b text-left">Tutor</th>
                <th className="py-2 px-4 border-b text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">
                    {player.photoURL && <img src={player.photoURL} alt="Jugador" className="w-10 h-10 rounded-full object-cover" />}
                  </td>
                  <td className="py-2 px-4 border-b font-medium text-gray-800">{player.name} {player.lastName}</td>
                  <td className="py-2 px-4 border-b">{player.gender}</td>
                  <td className="py-2 px-4 border-b">{player.email}</td>
                  <td className="py-2 px-4 border-b">{player.contactPhone}</td>
                  <td className="py-2 px-4 border-b">{player.category}</td>
                  <td className="py-2 px-4 border-b">{player.tierName || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">
                    {player.tutor ? (
                      <button
                        onClick={(e) => handleTutorClick(player.tutor, e)}
                        className="text-blue-600 hover:underline focus:outline-none text-left"
                      >
                        {player.tutor.name} {player.tutor.lastName}
                      </button>
                    ) : 'N/A'}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button onClick={() => handleEditPlayer(player)} className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded-md text-sm mr-2">Editar</button>
                    <button onClick={() => handleDeletePlayer(player.id)} className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-md text-sm">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tutor Tooltip */}
      {showTutorTooltip && tooltipTutorData && (
        <div
          className="fixed p-4 bg-gray-800 text-white rounded-lg shadow-lg z-50"
          style={{ top: `${tooltipPosition.y}px`, left: `${tooltipPosition.x}px` }}
        >
          <h4 className="font-bold mb-2">Información del Tutor</h4>
          <p><strong>Nombre:</strong> {tooltipTutorData.name} {tooltipTutorData.lastName}</p>
          <p><strong>Email:</strong> {tooltipTutorData.email}</p>
          <p><strong>Teléfono:</strong> {tooltipTutorData.contactPhone}</p>
          <button
            onClick={closeTutorTooltip}
            className="mt-3 bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-md text-sm"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Modal for Editing Player */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-40">
          <PlayerForm
            user={user}
            academy={academy}
            db={db}
            onComplete={() => {
              setShowEditModal(false);
              setEditingPlayer(null);
              fetchPlayers(); // Refresh players after modal closes
            }}
            playerToEdit={editingPlayer}
          />
        </div>
      )}
    </div>
  );
}