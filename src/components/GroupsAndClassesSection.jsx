import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, getDocs, addDoc, deleteDoc, where } from 'firebase/firestore';
import { Plus, Edit, Trash2, MoreVertical, Users, Calendar, ArrowRightLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import LoadingBar from './LoadingBar.jsx';
import '../styles/sections.css';
import { useAcademy } from '../contexts/AcademyContext';
import { hasValidMembership } from '../utils/permissions';
import { COLLECTIONS } from '../config/constants';

export default function GroupsAndClassesSection({ user, db }) {
  const { academy, membership } = useAcademy();
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
  const actionsMenuRef = useRef(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', minAge: '', maxAge: '', coach: '', maxCapacity: '', status: 'active' });
  const [groupError, setGroupError] = useState(null);

  // States for Schedule
  const [schedules, setSchedules] = useState({}); // { groupId: [scheduleItem, ...] }
  const [loadingSchedules, setLoadingSchedules] = useState(false); // fetch state
  const [scheduleSaving, setScheduleSaving] = useState(false); // save state
  const [activeScheduleGroupId, setActiveScheduleGroupId] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ day: 'Monday', startTime: '', endTime: '' });
  const [scheduleError, setScheduleError] = useState(null);
  const [groupMembers, setGroupMembers] = useState({}); // { groupId: [players] }
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const navigate = useNavigate();

  const fetchGroups = async () => {
    if (!user || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      setLoadingGroups(false);
      return;
    }
    setLoadingGroups(true);
    const groupsRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`);
    const q = query(groupsRef);
    const querySnapshot = await getDocs(q);
    const groupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroups(groupsData);
    setExpandedGroups(prev => {
      const next = { ...prev };
      groupsData.forEach(g => {
        if (next[g.id] === undefined) next[g.id] = true;
      });
      return next;
    });
    // Preload schedules for all groups
    setLoadingSchedules(true);
    for (const g of groupsData) {
      await fetchSchedulesForGroup(g.id);
    }
    setLoadingSchedules(false);
    setLoadingGroups(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user, academy, membership]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActiveGroupMenu(null);
      }
    };
    if (activeGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeGroupMenu]);

  const fetchSchedulesForGroup = async (groupId) => {
    if (!groupId || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      setLoadingSchedules(false);
      return;
    }
    setLoadingSchedules(true);
    const scheduleRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`);
    const q = query(scheduleRef);
    const querySnapshot = await getDocs(q);
    const scheduleData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSchedules(prev => ({ ...prev, [groupId]: scheduleData }));
    setLoadingSchedules(false);
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchSchedulesForGroup(selectedGroupId);
      fetchMembersForGroup(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchMembersForGroup = async (groupId) => {
    if (!groupId || !academy || !membership) return;
    if (!hasValidMembership(membership)) {
      return;
    }
    const playersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.PLAYERS}`);
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
        const groupDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`, editingGroup.id);
        await updateDoc(groupDocRef, groupData);
        toast.success("Group updated successfully.");
      } else {
        groupData.createdAt = new Date();
        const groupsCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`);
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
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this group?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}`, groupId));
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

  const handleOpenScheduleModal = (groupId, scheduleItem = null) => {
    setActiveScheduleGroupId(groupId);
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
    if (!activeScheduleGroupId || scheduleSaving) return;
    
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
        const scheduleDocRef = doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${activeScheduleGroupId}/schedule`, editingSchedule.id);
        await updateDoc(scheduleDocRef, scheduleData);
        toast.success("Session updated successfully.");
      } else {
        const scheduleCollectionRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${activeScheduleGroupId}/schedule`);
        await addDoc(scheduleCollectionRef, scheduleData);
        toast.success("Session added successfully.");
      }
      setShowScheduleModal(false);
      fetchSchedulesForGroup(activeScheduleGroupId);
    } catch (err) {
      setScheduleError("Error saving session: " + err.message);
      toast.error("Error saving session.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (groupId, scheduleId) => {
    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this session?</p>
        <div className="flex space-x-2 text-base">
          <button onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, `${COLLECTIONS.ACADEMIES}/${academy.id}/${COLLECTIONS.GROUPS}/${groupId}/schedule`, scheduleId));
              fetchSchedulesForGroup(groupId);
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
    <div className="section-container">
      <div className="section-content-wrapper space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Groups & Classes</h2>
          <div />
        </div>
      <div className="content-card-responsive">
      <LoadingBar loading={loadingGroups} />
      <div className="tabs-container">
          <div
            className="tabs-scroll-wrapper"
            onTouchStart={handleTabTouchStart}
            onTouchMove={handleTabTouchMove}
          >
            <nav className="tabs-nav" aria-label="Tabs" role="tablist">
              <button role="tab" aria-selected={activeGroupTab === 'groups'} onClick={handleTabClick(() => setActiveGroupTab('groups'))} className={`tab-button ${activeGroupTab === 'groups' ? 'active' : ''}`}>
              <Users /> Groups
            </button>
              <button role="tab" aria-selected={activeGroupTab === 'schedule'} onClick={handleTabClick(() => setActiveGroupTab('schedule'))} className={`tab-button ${activeGroupTab === 'schedule' ? 'active' : ''}`}>
              <Calendar /> Class Schedule
            </button>
              <button role="tab" aria-selected={activeGroupTab === 'transfers'} onClick={handleTabClick(() => setActiveGroupTab('transfers'))} className={`tab-button ${activeGroupTab === 'transfers' ? 'active' : ''}`}>
              <ArrowRightLeft /> Transfers
            </button>
            </nav>
            <div className="tabs-scroll-gradient md:hidden" aria-hidden />
          </div>
      </div>

      {activeGroupTab === 'groups' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenGroupModal()} className="btn-primary">
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
                <table className="min-w-full bg-section">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left table-header">Name</th>
                      <th className="py-2 px-4 border-b text-left table-header">Age Range</th>
                      <th className="py-2 px-4 border-b text-left table-header">Coach</th>
                      <th className="py-2 px-4 border-b text-left table-header">Capacity</th>
                      <th className="py-2 px-4 border-b text-left table-header">Status</th>
                      <th className="py-2 px-4 border-b text-right table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(group => (
                      <tr
                        key={group.id}
                        className="hover:bg-gray-50 cursor-pointer table-row-hover"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        <td className="py-3 px-4 border-b font-medium table-cell">{group.name}</td>
                        <td className="py-3 px-4 border-b table-cell">{group.minAge}-{group.maxAge} years</td>
                        <td className="py-3 px-4 border-b table-cell">{group.coach}</td>
                        <td className="py-3 px-4 border-b table-cell">{group.maxCapacity || 'N/A'}</td>
                        <td className="py-3 px-4 border-b table-cell"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{group.status}</span></td>
                        <td className="py-3 px-4 border-b text-right table-cell">
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
                    className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm relative"
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
        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = expandedGroups[group.id] ?? true;
            const groupSchedules = schedules[group.id] || [];
            return (
              <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !isOpen }))}
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.minAge}-{group.maxAge} yrs • Coach: {group.coach || 'N/A'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      onClick={(e) => { e.stopPropagation(); handleOpenScheduleModal(group.id); }}
                      className="btn-primary-sm cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleOpenScheduleModal(group.id); } }}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Session
                    </div>
                    <span className="text-sm text-gray-500">{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="p-4 space-y-2">
                    {groupSchedules.length > 0 ? (
                      groupSchedules.map(session => (
                        <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                          <p className="font-medium">{session.day}: <span className="font-normal">{session.startTime} - {session.endTime}</span></p>
                          <div className="space-x-2">
                            <button onClick={() => handleOpenScheduleModal(group.id, session)} className="p-1 text-gray-500 hover:text-primary"><Edit size={18} /></button>
                            <button onClick={() => handleDeleteSchedule(group.id, session.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center text-gray-500">
                        Empty
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-gray-500">No groups available.</p>}
        </div>
      )}
      {activeGroupTab === 'transfers' && <div className="text-center p-10 text-gray-500 border-2 border-dashed rounded-lg mt-4"><p>Module for moving students between groups coming soon.</p></div>}

      {/* Group Actions Menu */}
      {activeGroupMenu && (
        <div
          ref={actionsMenuRef}
          className="fixed bg-section border border-gray-border rounded-md shadow-lg z-50"
          style={{ top: `${actionsMenuPosition.y}px`, left: `${actionsMenuPosition.x}px`, transform: 'translateX(-100%)' }}
        >
          <ul className="py-1">
            <li className="text-base w-32"><button onClick={() => { handleOpenGroupModal(activeGroupMenu); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"><Edit className="mr-3 h-4 w-4" /><span>Edit</span></button></li>
            <li className="text-base"><button onClick={() => { handleDeleteGroup(activeGroupMenu.id); setActiveGroupMenu(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"><Trash2 className="mr-3 h-4 w-4" /><span>Delete</span></button></li>
          </ul>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowGroupModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button type="submit" disabled={loadingGroups} className="btn-primary w-full md:w-auto">{loadingGroups ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
          <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-md">
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
              <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                <button
                  type="submit"
                  disabled={scheduleSaving} // Corregido el estado de carga
                  className="btn-primary w-full md:w-auto"
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
