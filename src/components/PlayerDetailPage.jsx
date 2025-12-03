import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import PlayerDetail from '../components/PlayerDetail.jsx';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit } from 'lucide-react';

export default function PlayerDetailPage({ user, academy, db, membership }) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [paymentPage, setPaymentPage] = useState(1);

  const dateFromAny = (d) => (d?.seconds ? new Date(d.seconds * 1000) : new Date(d));

  const addCycleToDate = (date, pricingModel) => {
    const base = dateFromAny(date);
    const result = new Date(base);
    switch (pricingModel) {
      case 'monthly':
        result.setMonth(result.getMonth() + 1);
        break;
      case 'semi-annual':
        result.setMonth(result.getMonth() + 6);
        break;
      case 'annual':
        result.setFullYear(result.getFullYear() + 1);
        break;
      default:
        return null; // term or unknown -> no recurrence
    }
    return result;
  };

  const ensureSubscriptionPaymentsAreCurrent = async (playerData, tiersMap, playerRef) => {
    const payments = playerData.oneTimeProducts || [];
    const groupedByTier = new Map();

    payments
      .filter(p => p.paymentFor === 'tier')
      .forEach(p => {
        const tier = tiersMap.get(p.itemId);
        if (!tier) return;
        const list = groupedByTier.get(p.itemId) || [];
        list.push({ payment: p, tier });
        groupedByTier.set(p.itemId, list);
      });

    let updated = false;
    const newPayments = [...payments];
    const now = new Date();

    groupedByTier.forEach((list, tierId) => {
      // Sort by dueDate ascending
      list.sort((a, b) => dateFromAny(a.payment.dueDate) - dateFromAny(b.payment.dueDate));
      let lastDueDate = list[list.length - 1].payment.dueDate;
      const tierDetails = list[list.length - 1].tier;

      // Only auto-generate for recurring plans (non-term) that have cycled past now
      let nextCycleStart = addCycleToDate(lastDueDate, tierDetails.pricingModel);
      while (nextCycleStart && nextCycleStart <= now) {
        newPayments.push({
          paymentFor: 'tier',
          itemId: tierId,
          itemName: tierDetails.name,
          amount: tierDetails.price,
          dueDate: nextCycleStart,
          status: 'unpaid',
        });
        updated = true;
        lastDueDate = nextCycleStart;
        nextCycleStart = addCycleToDate(lastDueDate, tierDetails.pricingModel);
      }
    });

    if (!updated) return false;

    // Clean before saving
    const cleaned = newPayments.map(p => {
      const cp = { ...p };
      delete cp.productDetails;
      delete cp.originalIndex;
      delete cp.tierDetails;
      return cp;
    });

    await updateDoc(playerRef, { oneTimeProducts: cleaned });
    return true;
  };

  const fetchPlayerDetails = React.useCallback(async () => {
    if (!user || !db || !playerId || !academy || !membership) return;
    setLoading(true);

    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      setError(`You don't have permission to view this ${studentLabelSingular.toLowerCase()}.`);
      setLoading(false);
      return;
    }

    try {
      // Fetch Tiers, Trials, and Groups to create maps for names
      const academyId = academy.id;
      const tiersRef = collection(db, `academies/${academyId}/tiers`);
      const tiersSnap = await getDocs(tiersRef);
      const tiersMap = new Map(tiersSnap.docs.map(doc => [doc.id, doc.data()]));

      const trialsRef = collection(db, `academies/${academyId}/trials`);
      const trialsSnap = await getDocs(trialsRef);
      const trialsMap = new Map(trialsSnap.docs.map(doc => [doc.id, doc.data()]));

      const productsRef = collection(db, `academies/${academyId}/products`);
      const productsSnap = await getDocs(productsRef);
      const productsMap = new Map(productsSnap.docs.map(doc => [doc.id, doc.data()]));

      const groupsRef = collection(db, `academies/${academyId}/groups`);
      const groupsSnap = await getDocs(groupsRef);
      const groupsMap = new Map(groupsSnap.docs.map(doc => [doc.id, doc.data()]));

      // Fetch the specific player
      const playerRef = doc(db, `academies/${academyId}/players`, playerId);
      const playerSnap = await getDoc(playerRef);

      if (playerSnap.exists()) {
        const playerData = { id: playerSnap.id, ...playerSnap.data() };

        // Fetch tutor details if tutorId exists
        if (playerData.tutorId) {
          const tutorRef = doc(db, `academies/${academyId}/tutors`, playerData.tutorId);
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
            tierDetails: p.paymentFor === 'tier' ? tiersMap.get(p.itemId) : undefined,
          }));
        }

        // Auto-create next subscription period payments if the last one expired
        const updated = await ensureSubscriptionPaymentsAreCurrent(playerData, tiersMap, playerRef);
        if (updated) {
          // Re-fetch to show the newly added cycle
          fetchPlayerDetails();
          return;
        }

        setPlayer(playerData);
      }
    } catch (error) {
      console.error("Error fetching player details:", error);
      setError(`Failed to load ${studentLabelSingular.toLowerCase()} details.`);
    } finally {
      setLoading(false);
    }
  }, [user, db, playerId, academy, membership]);

  const studentLabelPlural = academy?.studentLabelPlural || 'Students';
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';

  useEffect(() => {
    fetchPlayerDetails();
  }, [fetchPlayerDetails, membership]);

  const handleMarkProductAsPaid = async (productIndex, paymentMethod, paymentDate) => {
    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const updatedProducts = [...player.oneTimeProducts];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      status: 'paid',
      paymentMethod: paymentMethod,
      paidAt: paidDate,
    };

    // This is the key fix: Clean the *entire* array before sending it to Firestore.
    const finalProductsForDB = updatedProducts.map(p => {
      const cleanProduct = { ...p };
      delete cleanProduct.productDetails;
      delete cleanProduct.originalIndex;
      delete cleanProduct.tierDetails;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${academy.id}/players`, playerId);
    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      setActiveTab('payments');
      await fetchPlayerDetails(); // reload to keep derived fields/product details in sync
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
      delete cleanProduct.tierDetails;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${academy.id}/players`, playerId);

    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      setActiveTab('payments');
      await fetchPlayerDetails(); // reload to keep derived fields in sync
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
    return <div className="text-center p-10">Loading {studentLabelSingular.toLowerCase()} details...</div>;
  }

  if (!player) {
    return <div className="text-center p-10 text-red-500">{error || `${studentLabelSingular} not found.`}</div>;
  }

  return (
    <div className="p-6">
      <div className="w-full max-w-screen-xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-semibold text-gray-800">
            <Link to="/students" className="text-primary hover:underline">{studentLabelPlural}</Link>
            <span className="text-gray-500 mx-2">&gt;</span>
            <span className="text-gray-800">{player.name} {player.lastName}</span>
          </div>
          <div>
            <button onClick={handleEdit} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              <span>Edit {studentLabelSingular}</span>
            </button>
          </div>
        </div>
        <PlayerDetail
          player={player}
          onMarkAsPaid={handleMarkProductAsPaid}
          onRemoveProduct={handleRemoveProduct}
          academy={academy}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          paymentPage={paymentPage}
          onPaymentPageChange={setPaymentPage}
        />
      </div>
    </div>
  );
}
