import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function PlayersSection({ user, academy, db, setActiveSection, setSelectedPlayer }) {
  const [players, setPlayers] = useState([]);
  const [tooltipTutorData, setTooltipTutorData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tiers, setTiers] = useState([]);
  const [showTutorTooltip, setShowTutorTooltip] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [filters, setFilters] = useState({ gender: '', category: '' });
  const [searchQuery, setSearchQuery] = useState('');
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

  const categories = useMemo(() => [...new Set(players.map(p => p.category).filter(Boolean))], [players]);
  const genders = useMemo(() => [...new Set(players.map(p => p.gender).filter(Boolean))], [players]);

  const filteredAndSortedPlayers = useMemo(() => {
    let filteredPlayers = [...players];

    // Apply search and filters
    filteredPlayers = filteredPlayers.filter(player => {
      const searchMatch = searchQuery
        ? `${player.name} ${player.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const genderMatch = filters.gender ? player.gender === filters.gender : true;
      const categoryMatch = filters.category ? player.category === filters.category : true;
      return searchMatch && genderMatch && categoryMatch;
    });

    // Apply sorting
    if (sortConfig.key !== null) {
        filteredPlayers.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return filteredPlayers;
  }, [players, filters, sortConfig, searchQuery]);

  useEffect(() => {
    fetchPlayers();
  }, [user, academy, db]); // Add db to dependencies

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prevFilters => ({ ...prevFilters, [filterName]: value }));
  };

  const handleAddPlayer = () => {
    setActiveSection('newStudent'); // Navigate to the new student creation page
  };

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setActiveSection('editStudent');
  };

  const handleDeletePlayer = async (playerId) => {
    const deleteAction = async () => {
      try {
        await deleteDoc(doc(db, `academies/${user.uid}/players`, playerId));
        fetchPlayers();
        toast.success("Student deleted successfully.");
      } catch (error) {
        console.error("Error al eliminar jugador:", error);
        toast.error("Error deleting student.");
      }
    }

    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this student?</p>
        <div className="flex space-x-2">
          <button
            onClick={() => { toast.dismiss(t.id); deleteAction(); }}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
    });
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
  
  const handleRowClick = (player) => {
    setSelectedPlayer(player);
    setActiveSection('studentDetail');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Header with title and Add Player button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Students of {academy.name}</h2>
        <button
          onClick={handleAddPlayer}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
        >
          Add New Student
        </button>
      </div>

      {/* Filters Section */}
      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="searchFilter" className="block text-sm font-medium text-gray-700">Search Student</label>
          <input
            type="text"
            id="searchFilter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="First or last name..."
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
        </div>
        <div>
          <label htmlFor="genderFilter" className="block text-sm font-medium text-gray-700">Filter by Gender</label>
          <select id="genderFilter" onChange={(e) => handleFilterChange('gender', e.target.value)} value={filters.gender} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="">All</option>
            {genders.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700">Filter by Category</label>
          <select id="categoryFilter" onChange={(e) => handleFilterChange('category', e.target.value)} value={filters.category} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="">All</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {filteredAndSortedPlayers.length === 0 ? (
        <p className="text-gray-600">No students registered yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Photo</th>
                <th className="py-2 px-4 border-b text-left">
                  <button onClick={() => handleSort('name')} className="font-bold">
                    Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </button>
                </th>
                <th className="py-2 px-4 border-b text-left">Gender</th>
                <th className="py-2 px-4 border-b text-left">Student Email</th>
                <th className="py-2 px-4 border-b text-left">Student Phone</th>
                <th className="py-2 px-4 border-b text-left">Category</th>
                <th className="py-2 px-4 border-b text-left">Tier</th>
                <th className="py-2 px-4 border-b text-left">Tutor</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.map(player => (
                <tr key={player.id} className="hover:bg-gray-100 cursor-pointer" onClick={() => handleRowClick(player)}>
                  <td className="py-2 px-4 border-b">
                    {player.photoURL && <img src={player.photoURL} alt="Student" className="w-10 h-10 rounded-full object-cover" />}
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
                    <button onClick={(e) => { e.stopPropagation(); handleEditPlayer(player); }} className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded-md text-sm mr-2">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id); }} className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-md text-sm">Delete</button>
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
          <h4 className="font-bold mb-2">Tutor Information</h4>
          <p><strong>Name:</strong> {tooltipTutorData.name} {tooltipTutorData.lastName}</p>
          <p><strong>Email:</strong> {tooltipTutorData.email}</p>
          <p><strong>Phone:</strong> {tooltipTutorData.contactPhone}</p>
          <button
            onClick={closeTutorTooltip}
            className="mt-3 bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-md text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}