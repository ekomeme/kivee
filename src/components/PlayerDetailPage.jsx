import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import PlayerDetail from '../components/PlayerDetail.jsx';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit } from 'lucide-react';

export default function PlayerDetailPage({ user, academy, db }) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlayerDetails = React.useCallback(async () => {
    if (!user || !db || !playerId) return;
    setLoading(true);
    try {
      // Fetch Tiers, Trials, and Groups to create maps for names
      const tiersRef = collection(db, `academies/${user.uid}/tiers`);
      const tiersSnap = await getDocs(tiersRef);
      const tiersMap = new Map(tiersSnap.docs.map(doc => [doc.id, doc.data()]));

      const trialsRef = collection(db, `academies/${user.uid}/trials`);
      const trialsSnap = await getDocs(trialsRef);
      const trialsMap = new Map(trialsSnap.docs.map(doc => [doc.id, doc.data()]));

      const productsRef = collection(db, `academies/${user.uid}/products`);
      const productsSnap = await getDocs(productsRef);
      const productsMap = new Map(productsSnap.docs.map(doc => [doc.id, doc.data()]));

      const groupsRef = collection(db, `academies/${user.uid}/groups`);
      const groupsSnap = await getDocs(groupsRef);
      const groupsMap = new Map(groupsSnap.docs.map(doc => [doc.id, doc.data()]));

      // Fetch the specific player
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

        // Get group name if groupId exists
        if (playerData.groupId) {
          playerData.groupName = groupsMap.get(playerData.groupId)?.name || 'N/A';
        }

        // Get plan details if a plan is assigned
        if (playerData.plan) {
          if (playerData.plan.type === 'tier') {
            playerData.planDetails = tiersMap.get(playerData.plan.id);
          } else if (playerData.plan.type === 'trial') {
            playerData.planDetails = trialsMap.get(playerData.plan.id);
          }
        }

        // Get one-time product details
        if (playerData.oneTimeProducts) {
          playerData.oneTimeProducts = playerData.oneTimeProducts.map(p => ({
            ...p,
            productDetails: productsMap.get(p.productId),
          }));
        }

        setPlayer(playerData);
      }
    } catch (error) {
      console.error("Error fetching player details:", error);
      setError("Failed to load student details.");
    } finally {
      setLoading(false);
    }
  }, [user, db, playerId]);

  useEffect(() => {
    fetchPlayerDetails();
  }, [fetchPlayerDetails]);

  const handleMarkProductAsPaid = async (productIndex, paymentMethod) => {
    const updatedProducts = [...player.oneTimeProducts];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      status: 'paid',
      paymentMethod: paymentMethod,
      paidAt: new Date(),
    };

    // This is the key fix: Clean the *entire* array before sending it to Firestore.
    const finalProductsForDB = updatedProducts.map(p => {
      const cleanProduct = { ...p };
      delete cleanProduct.productDetails;
      delete cleanProduct.originalIndex;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${user.uid}/players`, playerId);
    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      fetchPlayerDetails(); // Re-fetch all player data to ensure UI consistency
      toast.success('Payment registered successfully!');
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error('Failed to register payment.');
    }
  };

  const handleRemoveProduct = async (productIndex) => {
    const updatedProducts = player.oneTimeProducts.filter((_, index) => index !== productIndex);
    const finalProductsForDB = updatedProducts.map(p => {
      const cleanProduct = { ...p };
      delete cleanProduct.productDetails;
      delete cleanProduct.originalIndex;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${user.uid}/players`, playerId);

    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      fetchPlayerDetails(); // Re-fetch all player data
      toast.success('Item removed successfully!');
    } catch (error) {
      console.error("Error removing product:", error);
      toast.error('Failed to remove item.');
    }
  };

  const handleEdit = () => {
    navigate(`/students/${playerId}/edit`);
  };

  if (loading) {
    return <div className="text-center p-10">Loading student details...</div>;
  }

  if (!player) {
    return <div className="text-center p-10 text-red-500">{error || 'Student not found.'}</div>;
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
      <PlayerDetail player={player} onMarkAsPaid={handleMarkProductAsPaid} onRemoveProduct={handleRemoveProduct} academy={academy} />
    </div>
  );
}
