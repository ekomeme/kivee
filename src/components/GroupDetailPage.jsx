import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Users, Calendar, Edit3, Save, X, Trash2, Plus, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademy } from '../contexts/AcademyContext';
import { COLLECTIONS } from '../config/constants';
import { getLocations, getFacilities } from '../services/firestore';

export default function GroupDetailPage({ user, db }) {
  const { academy, membership, studentLabelPlural, studentLabelSingular, facilityLabelSingular } = useAcademy();
  const { groupId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [locations, setLocations] = useState([]);
  const [facilities, setFacilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [coachDraft, setCoachDraft] = useState('');

  // Schedule modal states
  const [scheduleForm, setScheduleForm] = useState({
    day: 'Monday',
    startTime: '',
    endTime: '',
    facilityId: '',
    attendeeIds: []
  });
  const [editingSession, setEditingSession] = useState(null);

  // Attendees modal states
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [managingSession, setManagingSession] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});

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

        // Fetch schedule
        const scheduleRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`);
        const scheduleSnap = await getDocs(scheduleRef);
        setSchedule(scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch locations and facilities
        const locationsData = await getLocations(db, academy.id);
        setLocations(locationsData);

        // Fetch facilities for the group's location
        if (groupData.locationId) {
          const facilitiesData = await getFacilities(db, academy.id, groupData.locationId);
          setFacilities({ [groupData.locationId]: facilitiesData });
        }
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

  const openSessionModal = (session = null) => {
    if (session) {
      setEditingSession(session);
      setScheduleForm({
        day: session.day || 'Monday',
        startTime: session.startTime || '',
        endTime: session.endTime || '',
        facilityId: session.facilityId || '',
        attendeeIds: session.attendeeIds || []
      });
    } else {
      setEditingSession(null);
      setScheduleForm({
        day: 'Monday',
        startTime: '',
        endTime: '',
        facilityId: '',
        attendeeIds: []
      });
    }
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    try {
      if (editingSession) {
        const ref = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`, editingSession.id);
        await updateDoc(ref, scheduleForm);
        toast.success('Session updated');
      } else {
        const ref = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`);
        await addDoc(ref, scheduleForm);
        toast.success('Session added');
      }
      const scheduleRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`);
      const snap = await getDocs(scheduleRef);
      setSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEditingSession(null);
      setScheduleForm({ day: 'Monday', startTime: '', endTime: '', facilityId: '', attendeeIds: [] });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      const ref = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`, sessionId);
      await deleteDoc(ref);
      setSchedule(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete session');
    }
  };

  const handleOpenAttendeesModal = (session) => {
    setManagingSession({ groupId, session });
    setShowAttendeesModal(true);
  };

  const handleToggleAttendee = (playerId) => {
    setManagingSession(prev => {
      const currentAttendeeIds = prev.session.attendeeIds || [];
      const isAttending = currentAttendeeIds.includes(playerId);
      const updatedAttendeeIds = isAttending
        ? currentAttendeeIds.filter(id => id !== playerId)
        : [...currentAttendeeIds, playerId];
      return {
        ...prev,
        session: { ...prev.session, attendeeIds: updatedAttendeeIds }
      };
    });
  };

  const handleSaveAttendees = async () => {
    if (!managingSession) return;
    const { session } = managingSession;
    try {
      const scheduleDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`, session.id);
      await updateDoc(scheduleDocRef, { attendeeIds: session.attendeeIds || [] });

      setSchedule(prev => prev.map(s =>
        s.id === session.id ? { ...s, attendeeIds: session.attendeeIds } : s
      ));

      toast.success("Attendees updated successfully");
      setShowAttendeesModal(false);
      setManagingSession(null);
    } catch (error) {
      console.error("Error saving attendees:", error);
      toast.error("Failed to save attendees");
    }
  };

  const toggleSessionExpand = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const getFacilityName = (facilityId) => {
    if (!facilityId || !group?.locationId) return null;
    const locationFacilities = facilities[group.locationId] || [];
    const facility = locationFacilities.find(f => f.id === facilityId);
    return facility?.name;
  };

  const getAttendingStudents = (attendeeIds) => {
    if (!attendeeIds || attendeeIds.length === 0) return [];
    return students.filter(s => attendeeIds.includes(s.id));
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
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'schedule'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Schedule & Attendance
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Age Range</p>
                  <p className="text-lg font-semibold text-gray-900">{group.minAge} - {group.maxAge} years</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                    group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {group.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Sessions per week</p>
                  <p className="text-lg font-semibold text-gray-900">{schedule.length}</p>
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
                <button
                  onClick={() => navigate(`/students?groupId=${groupId}`)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add {studentLabelSingular}
                </button>
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
                  <button
                    onClick={() => navigate(`/students?groupId=${groupId}`)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover"
                  >
                    <Plus className="-ml-1 mr-2 h-4 w-4" />
                    Add {studentLabelSingular}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Schedule & Attendance Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Schedule & Attendance</h2>
                <button
                  onClick={() => openSessionModal()}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Session
                </button>
              </div>

              {schedule.length > 0 ? (
                <div className="space-y-3">
                  {schedule.map(session => {
                    const facilityName = getFacilityName(session.facilityId);
                    const attendingStudents = getAttendingStudents(session.attendeeIds);
                    const isExpanded = expandedSessions[session.id];

                    return (
                      <div key={session.id} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleSessionExpand(session.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </button>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {session.day}: {session.startTime} - {session.endTime}
                                  </p>
                                  {facilityName && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      📍 {facilityName}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600 mt-1">
                                    👥 {attendingStudents.length} / {students.length} {studentLabelPlural.toLowerCase()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenAttendeesModal(session)}
                                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                              >
                                Manage Attendees
                              </button>
                              <button
                                onClick={() => openSessionModal(session)}
                                className="p-1.5 text-gray-500 hover:text-primary"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded view - Show attending students */}
                          {isExpanded && attendingStudents.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-300">
                              <p className="text-sm font-medium text-gray-700 mb-2">Attending students:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {attendingStudents.map(student => (
                                  <div key={student.id} className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span>{student.name} {student.lastName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No schedule sessions yet</p>
                  <button
                    onClick={() => openSessionModal()}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover"
                  >
                    <Plus className="-ml-1 mr-2 h-4 w-4" />
                    Add Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule Modal */}
        {editingSession !== null && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
            <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-md">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingSession.id ? 'Edit Session' : 'Add Session'}</h3>
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Day</label>
                  <select
                    value={scheduleForm.day}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, day: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start time</label>
                    <input
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End time</label>
                    <input
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {facilityLabelSingular} (Optional)
                  </label>
                  <select
                    value={scheduleForm.facilityId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, facilityId: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="">No specific {facilityLabelSingular.toLowerCase()}</option>
                    {(facilities[group?.locationId] || [])
                      .filter(f => f.status === 'active')
                      .map(facility => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSession(null);
                      setScheduleForm({ day: 'Monday', startTime: '', endTime: '', facilityId: '', attendeeIds: [] });
                    }}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingSession.id ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attendees Modal */}
        {showAttendeesModal && managingSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Manage Attendees</h3>
                <button
                  onClick={() => {
                    setShowAttendeesModal(false);
                    setManagingSession(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {managingSession.session.day}: {managingSession.session.startTime} - {managingSession.session.endTime}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Select {studentLabelPlural.toLowerCase()} attending this session
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {students.length > 0 ? (
                  students.map(student => {
                    const isAttending = (managingSession.session.attendeeIds || []).includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          isAttending
                            ? 'border-primary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAttending}
                          onChange={() => handleToggleAttendee(student.id)}
                          className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{student.name} {student.lastName}</p>
                          {student.email && (
                            <p className="text-xs text-gray-500">{student.email}</p>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No {studentLabelPlural.toLowerCase()} in this group</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttendeesModal(false);
                    setManagingSession(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAttendees}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors"
                >
                  Save Attendees
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
