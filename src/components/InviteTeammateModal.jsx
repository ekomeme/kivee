import React, { useState } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { sanitizeEmail, isValidEmail } from '../utils/validators';
import { ROLES, COLLECTIONS, ERROR_MESSAGES } from '../config/constants';
import { canManageTeam as canManageTeamPermission } from '../utils/permissions';

export default function InviteTeammateModal({
  isOpen,
  onClose,
  user,
  academy,
  db,
  membership,
  onInviteSent
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const academyId = academy.id;
  const canManageTeam = canManageTeamPermission(membership);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageTeam || !inviteEmail.trim()) return;

    const sanitizedEmail = sanitizeEmail(inviteEmail);
    if (!isValidEmail(sanitizedEmail)) {
      toast.error(ERROR_MESSAGES.INVALID_INPUT);
      return;
    }

    setIsInviting(true);
    try {
      // Fetch current team members and invites to check for duplicates
      const [membersSnap, invitesSnap] = await Promise.all([
        getDocs(collection(db, `${COLLECTIONS.ACADEMIES}/${academyId}/${COLLECTIONS.MEMBERS}`)),
        getDocs(collection(db, `${COLLECTIONS.ACADEMIES}/${academyId}/${COLLECTIONS.INVITATIONS}`)),
      ]);

      const teamMembers = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const teamInvites = invitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const isAlreadyMember = teamMembers.some(m => (m.email || '').toLowerCase() === sanitizedEmail);
      const isAlreadyInvited = teamInvites.some(i => (i.email || '').toLowerCase() === sanitizedEmail && i.status === 'pending');

      if (isAlreadyMember) {
        toast.error("That user is already part of the team.");
        setIsInviting(false);
        return;
      }
      if (isAlreadyInvited) {
        toast.error("A pending invitation already exists for that email.");
        setIsInviting(false);
        return;
      }

      await addDoc(collection(db, `${COLLECTIONS.ACADEMIES}/${academyId}/${COLLECTIONS.INVITATIONS}`), {
        email: sanitizedEmail,
        status: 'pending',
        invitedBy: user.uid,
        role: ROLES.ADMIN,
        invitedAt: serverTimestamp(),
      });

      toast.success("Invitation sent successfully.");
      setInviteEmail('');
      onClose();

      if (onInviteSent) {
        onInviteSent();
      }
    } catch (err) {
      console.error("Error inviting teammate:", err);
      toast.error(ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-section rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Invite teammate</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="email@domain.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? 'Sending...' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
