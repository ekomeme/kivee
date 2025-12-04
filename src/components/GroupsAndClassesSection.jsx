import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc, where } from 'firebase/firestore';
import { Plus, Edit, Trash2, MoreVertical, Users, Calendar, ArrowRightLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function GroupsAndClassesSection({ user, academy, db, membership }) {
  const [activeGroupTab, setActiveGroupTab] = useState('groups'); // 'groups', 'schedule', 'transfers'
  const touchStartX = useRef(0);
  const touchMoved = useRef(false);

  // States for Groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [activeGroupMenu, setActiveGroupMenu] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', minAge: '', maxAge: '', coach: '', maxCapacity: '', status: 'active' });
  const [groupError, setGroupError] = useState(null);

  // States for Schedule
  const [schedules, setSchedules] = useState({}); // { groupId: [scheduleItem, ...] }
  const [loadingSchedules, setLoadingSchedules] = useState(false); // fetch state
  const [scheduleSaving, setScheduleSaving] = useState(false); // save state
  const [selectedGroupIdForSchedule, setSelectedGroupIdForSchedule] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ day: 'Monday', startTime: '', endTime: '' });
  const [scheduleError, setScheduleError] = useState(null);
  const [groupMembers, setGroupMembers] = useState({}); // { groupId: [players] }
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    if (!user || !academy || !membership) return;
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      setLoadingGroups(false);
      return;
    }
    setLoadingGroups(true);
    const groupsRef = collection(db, `academies/${academy.id}/groups`);
    const q = query(groupsRef);
    const querySnapshot = await getDocs(q);
    const groupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroups(groupsData);
    setLoadingGroups(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user, academy, membership]);

  const fetchSchedulesForGroup = async (groupId) => {
    if (!groupId || !academy || !membership) return;
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      setLoadingSchedules(false);
      return;
    }
    setLoadingSchedules(true);
    const scheduleRef = collection(db, `academies/${academy.id}/groups/${groupId}/schedule`);
    const q = query(scheduleRef);
    const querySnapshot = await getDocs(q);
    const scheduleData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSchedules(prev => ({ ...prev, [groupId]: scheduleData }));
    setLoadingSchedules(false);
  };

  useEffect(() => {
    if (selectedGroupIdForSchedule) fetchSchedulesForGroup(selectedGroupIdForSchedule);
  }, [selectedGroupIdForSchedule]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchSchedulesForGroup(selectedGroupId);
      fetchMembersForGroup(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchMembersForGroup = async (groupId) => {
    if (!groupId || !academy || !membership) return;
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      return;
    }
    const playersRef = collection(db, `academies/${academy.id}/players`);
    const q = query(playersRef, where('groupId', '==', groupId));
    const snap = await getDocs(q);
    const players = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroupMembers(prev => ({ ...prev, [groupId]: players }));
  };

  const handleGroupFormChange = (e) => {
    const { name, value } = e.target;
    setGroupForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenGroupModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name || '',
        description: group.description || '',
        minAge: group.minAge || '',
        maxAge: group.maxAge || '',
        coach: group.coach || '',
        maxCapacity: group.maxCapacity || '',
        status: group.status || 'active',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', minAge: '', maxAge: '', coach: '', maxCapacity: '', status: 'active' });
      setGroupError(null);
    }
    setShowGroupModal(true);
  };

  const handleAddOrUpdateGroup = async (e) => {
    e.preventDefault();
    if (!user || loadingGroups) return;
    
    // Lógica de permisos corregida
    const userIsOwner = academy?.ownerId === user.uid;
    const userIsAdmin = membership?.role === 'admin';

    if (!userIsOwner && !userIsAdmin) {
      toast.error("You don't have permission to modify groups.");
      return;
    }

    setLoadingGroups(true);
    setGroupError(null);

    const groupData = {
      ...groupForm,
      minAge: Number(groupForm.minAge) || 0,
      maxAge: Number(groupForm.maxAge) || 0,
      maxCapacity: groupForm.maxCapacity ? Number(groupForm.maxCapacity) : null,
      academyId: academy.id,
      updatedAt: new Date(),
    };

    try {
      if (editingGroup) {
        const groupDocRef = doc(db, `academies/${academy.id}/groups`, editingGroup.id);
        await updateDoc(groupDocRef, groupData);
        toast.success("Group updated successfully.");
      } else {
        groupData.createdAt = new Date();
        const groupsCollectionRef = collection(db, `academies/${academy.id}/groups`);
        await addDoc(groupsCollectionRef, groupData);
        toast.success("Group added successfully.");
      }
      setShowGroupModal(false);
      fetchGroups();
    } catch (err) {
      setGroupError("Error saving group: " + err.message);
      toast.error("Error saving group.");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this group?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, `academies/${academy.id}/groups`, groupId));
              fetchGroups();
              toast.success("Group deleted successfully.");
            } catch (error) {
              toast.error("Error deleting group.");
            }
          }} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  const handleOpenScheduleModal = (scheduleItem = null) => {
    if (scheduleItem) {
      setEditingSchedule(scheduleItem);
      setScheduleForm({
        day: scheduleItem.day || 'Monday',
        startTime: scheduleItem.startTime || '',
        endTime: scheduleItem.endTime || '',
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({ day: 'Monday', startTime: '', endTime: '' });
      setScheduleError(null);
    }
    setScheduleSaving(false);
    setShowScheduleModal(true);
  };

  const handleAddOrUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedGroupIdForSchedule || scheduleSaving) return;
    
    // Lógica de permisos corregida
    const userIsOwner = academy?.ownerId === user.uid;
    const userIsAdmin = membership?.role === 'admin';

    if (!userIsOwner && !userIsAdmin) {
      toast.error("You don't have permission to modify schedules.");
      return;
    }

    setScheduleSaving(true);
    setScheduleError(null);

    const scheduleData = { ...scheduleForm };

    try {
      if (editingSchedule) {
        const scheduleDocRef = doc(db, `academies/${academy.id}/groups/${selectedGroupIdForSchedule}/schedule`, editingSchedule.id);
        await updateDoc(scheduleDocRef, scheduleData);
        toast.success("Session updated successfully.");
      } else {
        const scheduleCollectionRef = collection(db, `academies/${academy.id}/groups/${selectedGroupIdForSchedule}/schedule`);
        await addDoc(scheduleCollectionRef, scheduleData);
        toast.success("Session added successfully.");
      }
      setShowScheduleModal(false);
      fetchSchedulesForGroup(selectedGroupIdForSchedule);
    } catch (err) {
      setScheduleError("Error saving session: " + err.message);
      toast.error("Error saving session.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    toast((t) => (
      <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this session?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, `academies/${academy.id}/groups/${selectedGroupIdForSchedule}/schedule`, scheduleId));
              fetchSchedulesForGroup(selectedGroupIdForSchedule);
              toast.success("Session deleted successfully.");
            } catch (error) {
              toast.error("Error deleting session.");
            }
          }} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Confirm</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancel</button>
        </div>
      </div>
    ), { duration: 6000 });;
  };

  const handleTabTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchMoved.current = false;
  };

  const handleTabTouchMove = (e) => {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) {
      touchMoved.current = true;
    }
  };

  const handleTabClick = (action) => (e) => {
    if (touchMoved.current) {
      touchMoved.current = false;
      return;
    }
    action();
  };

  return (
    <div className="p-6">
      <div className="w-full max-w-screen-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Groups & Classes</h2>
          <div />
        </div>
      <div className="bg-white rounded-none shadow-none md:rounded-lg md:shadow-md p-4 md:p-6">
      <div className="border-b border-gray-200 mb-4">
          <div
            className="relative w-full max-w-full overflow-x-auto no-scrollbar"
            onTouchStart={handleTabTouchStart}
            onTouchMove={handleTabTouchMove}
          >
            <nav className="-mb-px flex space-x-6 w-max min-w-0" aria-label="Tabs" role="tablist">
              <button role="tab" aria-selected={activeGroupTab === 'groups'} onClick={handleTabClick(() => setActiveGroupTab('groups'))} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${activeGroupTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Users className="mr-2 h-5 w-5" /> Groups
            </button>
              <button role="tab" aria-selected={activeGroupTab === 'schedule'} onClick={handleTabClick(() => setActiveGroupTab('schedule'))} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${activeGroupTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Calendar className="mr-2 h-5 w-5" /> Class Schedule
            </button>
              <button role="tab" aria-selected={activeGroupTab === 'transfers'} onClick={handleTabClick(() => setActiveGroupTab('transfers'))} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center ${activeGroupTab === 'transfers' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <ArrowRightLeft className="mr-2 h-5 w-5" /> Transfers
            </button>
            </nav>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden" aria-hidden />
          </div>
      </div>

      {activeGroupTab === 'groups' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenGroupModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Add New Group
            </button>
          </div>
          {groups.length === 0 ? (
            <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4">
              <p>No groups created yet.</p>
              <p className="text-sm">Click "Add New Group" to get started.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead><tr><th className="py-2 px-4 border-b text-left">Name</th><th className="py-2 px-4 border-b text-left">Age Range</th><th className="py-2 px-4 border-b text-left">Coach</th><th className="py-2 px-4 border-b text-left">Capacity</th><th className="py-2 px-4 border-b text-left">Status</th><th className="py-2 px-4 border-b text-right">Actions</th></tr></thead>
                  <tbody>
                    {groups.map(group => (
                      <tr
                        key={group.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        <td className="py-3 px-4 border-b font-medium">{group.name}</td>
                        <td className="py-3 px-4 border-b">{group.minAge}-{group.maxAge} years</td>
                        <td className="py-3 px-4 border-b">{group.coach}</td>
                        <td className="py-3 px-4 border-b">{group.maxCapacity || 'N/A'}</td>
                        <td className="py-3 px-4 border-b"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{group.status}</span></td>
                        <td className="py-3 px-4 border-b text-right">
                        <button onClick={(e) => { e.stopPropagation(); setActiveGroupMenu(group); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }} className="p-1 rounded-full hover:bg-gray-200 focus:outline-none" aria-label={`Actions for group ${group.name}`}><MoreVertical className="h-5 w-5 text-gray-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 md:hidden">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveGroupMenu(group); setActionsMenuPosition({ x: e.currentTarget.getBoundingClientRect().right + window.scrollX, y: e.currentTarget.getBoundingClientRect().top + window.scrollY }); }}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 text-lg">{group.name}</p>
                      <p className="text-sm text-gray-600">{group.minAge}-{group.maxAge} years • Coach: {group.coach || 'N/A'}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                      <div className="bg-gray-50 rounded-md p-2">
                        <p className="text-xs text-gray-500">Capacity</p>
                        <p className="font-medium">{group.maxCapacity || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="font-medium capitalize">{group.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {activeGroupTab === 'schedule' && (
        <div>
          <div className="mb-4 max-w-sm">
            <label htmlFor="group-select" className="block text-sm font-medium text-gray-700">Select a Group to Manage Schedule</label>
            <select id="group-select" value={selectedGroupIdForSchedule} onChange={(e) => setSelectedGroupIdForSchedule(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
              <option value="">-- Select a Group --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {selectedGroupIdForSchedule && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenScheduleModal()} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
                  <Plus className="mr-2 h-5 w-5" /> Add Session
                </button>
              </div>
              <div className="space-y-2">
                {schedules[selectedGroupIdForSchedule]?.length > 0 ? (
                  schedules[selectedGroupIdForSchedule].map(session => (
                    <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                      <p className="font-medium">{session.day}: <span className="font-normal">{session.startTime} - {session.endTime}</span></p>
                      <div className="space-x-2">
                        <button onClick={() => handleOpenScheduleModal(session)} className="p-1 text-gray-500 hover:text-primary"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteSchedule(session.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No sessions scheduled for this group yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {activeGroupTab === 'transfers' && <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4"><p>Module for moving students between groups coming soon.</p></div>}

      {/* Group Actions Menu */}
      {activeGroupMenu && (
        <div className="fixed bg-white border border-gray-border rounded-md shadow-lg z-50" style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}>
          <ul className="py-1">
            <li className="text-base w-32"><button onClick={() => { handleOpenGroupModal(activeGroupMenu); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"><Edit className="mr-3 h-4 w-4" /><span>Edit</span></button></li>
            <li className="text-base"><button onClick={() => { handleDeleteGroup(activeGroupMenu.id); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"><Trash2 className="mr-3 h-4 w-4" /><span>Delete</span></button></li>
          </ul>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-white md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-white p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{editingGroup ? 'Edit Group' : 'Add New Group'}</h3>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateGroup} className="space-y-4">
              <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Group Name</label><input type="text" name="name" value={groupForm.name} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label><textarea name="description" value={groupForm.description} onChange={handleGroupFormChange} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="minAge" className="block text-sm font-medium text-gray-700">Min Age</label><input type="number" name="minAge" value={groupForm.minAge} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                <div><label htmlFor="maxAge" className="block text-sm font-medium text-gray-700">Max Age</label><input type="number" name="maxAge" value={groupForm.maxAge} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="coach" className="block text-sm font-medium text-gray-700">Assigned Coach</label><input type="text" name="coach" value={groupForm.coach} onChange={handleGroupFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                <div><label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700">Max Capacity (Optional)</label><input type="number" name="maxCapacity" value={groupForm.maxCapacity} onChange={handleGroupFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </div>
              <div><label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label><select name="status" value={groupForm.status} onChange={handleGroupFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              {groupError && <p className="text-red-500 text-sm mt-4">{groupError}</p>}
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-white py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowGroupModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={loadingGroups} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 w-full md:w-auto">{loadingGroups ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-white md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-white p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-md">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">{editingSchedule ? 'Edit Session' : 'Add New Session'}</h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateSchedule} className="space-y-4">
              <div><label htmlFor="day" className="block text-sm font-medium text-gray-700">Day of the Week</label><select name="day" id="day" value={scheduleForm.day} onChange={(e) => setScheduleForm(prev => ({ ...prev, day: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
              </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label><input type="time" name="startTime" id="startTime" value={scheduleForm.startTime} onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                <div><label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label><input type="time" name="endTime" id="endTime" value={scheduleForm.endTime} onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
              </div>
              {scheduleError && <p className="text-red-500 text-sm mt-4">{scheduleError}</p>}
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-white py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button
                  type="submit"
                  disabled={scheduleSaving} // Corregido el estado de carga
                  className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 w-full md:w-auto"
                >
                  {scheduleSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  );
}
