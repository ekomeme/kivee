import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Users, Edit3, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademy } from '../contexts/AcademyContext';
import { COLLECTIONS } from '../config/constants';
import { getLocations } from '../services/firestore';

export default function GroupDetailPage({ user, db }) {
  const { academy, membership, studentLabelPlural } = useAcademy();
  const { groupId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [coachDraft, setCoachDraft] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db || !groupId || !academy?.id || !membership) return;
      setLoading(true);
      try {
        // Fetch group data
        const groupRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`, groupId);
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
          setError('Group not found');
          setLoading(false);
          return;
        }
        const groupData = { id: groupSnap.id, ...groupSnap.data() };
        setGroup(groupData);
        setCoachDraft(groupData.coach || '');

        // Fetch students using members subcollection
        const membersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/members`);
        const membersSnap = await getDocs(membersRef);
        const memberIds = membersSnap.docs.map(doc => doc.data().playerId);

        // Fetch player details
        const playersPromises = memberIds.map(async (playerId) => {
          const playerDoc = await getDocs(query(
            collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PLAYERS}`),
            where('__name__', '==', playerId)
          ));
          if (!playerDoc.empty) {
            return { id: playerId, ...playerDoc.docs[0].data() };
          }
          return null;
        });
        const players = (await Promise.all(playersPromises)).filter(p => p !== null);
        setStudents(players);

        // Fetch locations and facilities
        const locationsData = await getLocations(db, academy.id);
        setLocations(locationsData);
      } catch (err) {
        console.error('Error loading group detail:', err);
        setError('Failed to load group detail');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, db, groupId, academy, membership]);

  const handleSaveGroup = async () => {
    try {
      const groupRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`, groupId);
      await updateDoc(groupRef, { coach: coachDraft });
      setGroup(prev => ({ ...prev, coach: coachDraft }));
      setEditing(false);
      toast.success('Group updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update group');
    }
  };

  const handleCancel = () => {
    setCoachDraft(group.coach || '');
    setEditing(false);
  };

  if (loading) return <div className="p-6">Loading group...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!group) return <div className="p-6 text-red-600">Group not found</div>;

  const groupLocation = locations.find(loc => loc.id === group.locationId);

  return (
    <div className="p-6">
      <div className="w-full max-w-screen-xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-semibold text-gray-800">
            <Link to="/groups" className="text-primary hover:underline">Groups & Classes</Link>
            <span className="text-gray-500 mx-2">&gt;</span>
            <span className="text-gray-800">{group.name}</span>
          </div>
          <button onClick={() => navigate('/groups')} className="text-primary hover:underline text-sm">
            Back to list
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {studentLabelPlural} ({students.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-section p-6 rounded-lg shadow border border-gray-200">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
                <div className="flex items-center space-x-3">
                  {!editing && (
                    <button onClick={() => setEditing(true)} className="flex items-center text-primary hover:underline text-sm">
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </button>
                  )}
                  {editing && (
                    <>
                      <button onClick={handleSaveGroup} className="flex items-center text-primary hover:underline text-sm">
                        <Save className="h-4 w-4 mr-1" /> Save
                      </button>
                      <button onClick={handleCancel} className="flex items-center text-gray-600 hover:underline text-sm">
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="text-lg font-semibold text-gray-900">{groupLocation?.name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Coach</p>
                  {editing ? (
                    <input
                      type="text"
                      value={coachDraft}
                      onChange={(e) => setCoachDraft(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      placeholder="Coach name"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">{group.coach || 'N/A'}</p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Capacity</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {students.length} / {group.maxCapacity || 'Unlimited'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Age Range</p>
                  <p className="text-lg font-semibold text-gray-900">{group.minAge} - {group.maxAge} years</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`badge text-sm px-3 py-1 ${
                    group.status === 'active' ? 'badge-success' : 'badge-error'
                  }`}>
                    {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                  </span>
                </div>
              </div>

              {group.description && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-gray-900">{group.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{studentLabelPlural}</h2>
              </div>

              {students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map(student => (
                    <div key={student.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{student.name} {student.lastName}</p>
                          <p className="text-sm text-gray-600">{student.email || 'No email'}</p>
                        </div>
                      </div>
                      {student.contactPhone && (
                        <p className="text-sm text-gray-500">📱 {student.contactPhone}</p>
                      )}
                      {student.birthDate && (
                        <p className="text-sm text-gray-500">🎂 {student.birthDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No {studentLabelPlural.toLowerCase()} in this group yet</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
