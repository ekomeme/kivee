import React, { useState } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { sanitizeEmail } from '../utils/validators';

export default function InviteTeammateModal({
  isOpen,
  onClose,
  user,
  academy,
  db,
  onInviteSent
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const academyId = academy.id || academy.ownerId || user?.uid;
  const canManageTeam = academy.ownerId === user?.uid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageTeam || !inviteEmail.trim()) return;

    const sanitizedEmail = sanitizeEmail(inviteEmail);
    if (!sanitizedEmail) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setIsInviting(true);
    try {
      // Fetch current team members and invites to check for duplicates
      const [membersSnap, invitesSnap] = await Promise.all([
        getDocs(collection(db, `academies/${academyId}/members`)),
        getDocs(collection(db, `academies/${academyId}/invites`)),
      ]);

      const teamMembers = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const teamInvites = invitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const isAlreadyMember = teamMembers.some(m => (m.email || '').toLowerCase() === sanitizedEmail);
      const isAlreadyInvited = teamInvites.some(i => (i.email || '').toLowerCase() === sanitizedEmail && i.status === 'pending');

      if (isAlreadyMember) {
        toast.error("Ese usuario ya es parte del equipo.");
        setIsInviting(false);
        return;
      }
      if (isAlreadyInvited) {
        toast.error("Ya existe una invitación pendiente para ese correo.");
        setIsInviting(false);
        return;
      }

      await addDoc(collection(db, `academies/${academyId}/invites`), {
        email: sanitizedEmail,
        status: 'pending',
        invitedBy: user.uid,
        role: 'admin',
        invitedAt: serverTimestamp(),
      });

      toast.success("Invitación enviada.");
      setInviteEmail('');
      onClose();

      if (onInviteSent) {
        onInviteSent();
      }
    } catch (err) {
      console.error("Error inviting teammate:", err);
      toast.error("No se pudo enviar la invitación.");
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
