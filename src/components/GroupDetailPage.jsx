import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Users, Calendar, Edit3, Save, X, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAcademy } from '../contexts/AcademyContext';
import { COLLECTIONS } from '../config/constants';

export default function GroupDetailPage({ user, db }) {
  const { academy, membership, studentLabelPlural, studentLabelSingular } = useAcademy();
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [coachDraft, setCoachDraft] = useState('');
  const [scheduleForm, setScheduleForm] = useState({ day: 'Monday', startTime: '', endTime: '' });
  const [editingSession, setEditingSession] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db || !groupId || !academy?.id || !membership) return;
      setLoading(true);
      try {
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

        const playersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PLAYERS}`);
        const playersQ = query(playersRef, where('groupId', '==', groupId));
        const playersSnap = await getDocs(playersQ);
        setStudents(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const scheduleRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`);
        const scheduleSnap = await getDocs(scheduleRef);
        setSchedule(scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading group detail:', err);
        setError('Failed to load group detail');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, db, groupId, academy, membership]);

  if (loading) return <div className="p-6">Loading group...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!group) return <div className="p-6 text-red-600">Group not found</div>;

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
      setScheduleForm({ day: session.day || 'Monday', startTime: session.startTime || '', endTime: session.endTime || '' });
    } else {
      setEditingSession(null);
      setScheduleForm({ day: 'Monday', startTime: '', endTime: '' });
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
      setScheduleForm({ day: 'Monday', startTime: '', endTime: '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
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

  return (
    <div className="p-6">
      <div className="w-full max-w-screen-xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-semibold text-gray-800">
            <Link to="/groups" className="text-primary hover:underline">Groups & Classes</Link>
            <span className="text-gray-500 mx-2">&gt;</span>
            <span className="text-gray-800">{group.name}</span>
          </div>
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
            <button onClick={() => navigate('/groups')} className="text-primary hover:underline text-sm">Back to list</button>
          </div>
        </div>

        <div className="bg-section p-6 rounded-lg shadow border border-gray-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Group</p>
              <p className="text-lg font-semibold text-gray-900">{group.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Coach</p>
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
            <div>
              <p className="text-sm text-gray-600">Capacity</p>
              <p className="text-lg font-semibold text-gray-900">{group.maxCapacity || 'N/A'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Age Range</p>
              <p className="text-lg font-semibold text-gray-900">{group.minAge} - {group.maxAge} years</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{group.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">{studentLabelPlural}</h3>
              </div>
              {students.length ? (
                <ul className="space-y-2">
                  {students.map(s => (
                    <li key={s.id} className="flex items-center justify-between bg-gray-50 border rounded px-3 py-2 text-sm">
                      <span>{s.name} {s.lastName}</span>
                      <span className="text-gray-500 text-xs">{s.email || s.contactPhone || ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No students assigned.</p>
              )}
            </div>
            <div>
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
              </div>
              {editing && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => openSessionModal()}
                    className="flex items-center text-sm text-primary hover:underline"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add session
                  </button>
                </div>
              )}
              {schedule.length ? (
                <ul className="space-y-2">
                  {schedule.map(s => (
                    <li key={s.id} className="flex items-center justify-between bg-gray-50 border rounded px-3 py-2 text-sm">
                      <span>{s.day}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-600">{s.startTime} - {s.endTime}</span>
                        {editing && (
                          <>
                            <button onClick={() => openSessionModal(s)} className="text-primary text-xs">Edit</button>
                            <button onClick={() => handleDeleteSession(s.id)} className="text-red-600 text-xs flex items-center"><Trash2 className="h-3 w-3 mr-1" />Delete</button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No schedule yet.</p>
              )}
            </div>
          </div>
        </div>

        {editingSession !== null && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
            <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-md">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingSession ? 'Edit Session' : 'Add Session'}</h3>
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Close"
                >
                  ×
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
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => { setEditingSession(null); setScheduleForm({ day: 'Monday', startTime: '', endTime: '' }); }} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800">Cancel</button>
                  <button type="submit" className="btn-primary">{editingSession ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
