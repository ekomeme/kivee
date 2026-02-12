import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, getDocs, doc, deleteDoc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { deleteObject, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import toast from 'react-hot-toast';
import { useAcademy } from '../contexts/AcademyContext';
import { calculateAge } from '../utils/formatters';
import { hasValidMembership } from '../utils/permissions';
import { sanitizeFilename } from '../utils/validators';
import LoadingBar from './LoadingBar.jsx';
import PlayerForm from './PlayerForm.jsx';
import PlayerDetail from './PlayerDetail.jsx';
import '../styles/sections.css';

import { Plus, ArrowUp, ArrowDown, Edit, Trash2, Search, Mail, Phone, Copy, MoreVertical, Settings2, ChevronRight, Check, X, Download, Users as UsersIcon } from 'lucide-react';
export default function PlayersSection({ user, db }) {
  const { academy, membership, studentLabelPlural, studentLabelSingular } = useAcademy();
  const location = useLocation();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bulk actions state
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);

  // Cache for reference data
  const [tiersCache, setTiersCache] = useState(new Map());
  const [trialsCache, setTrialsCache] = useState(new Map());
  const [productsCache, setProductsCache] = useState(new Map());
  const [groupsCache, setGroupsCache] = useState(new Map());
  const [locationsCache, setLocationsCache] = useState(new Map());

  // Fetches players and their tutors
  const fetchPlayers = async () => {
    // La validación de permisos ya se hace en el useEffect
    setLoading(true);
    setError(null);

    try {
      // 2. Usar 'academy.id' en lugar de 'user.uid' para que funcione para todos los miembros.
      // Fetch all collections in parallel
      const [tiersSnapshot, trialsSnapshot, productsSnapshot, groupsSnapshot, tutorsSnapshot, locationsSnapshot, playersSnapshot] = await Promise.all([
        getDocs(collection(db, `academies/${academy.id}/tiers`)),
        getDocs(collection(db, `academies/${academy.id}/trials`)),
        getDocs(collection(db, `academies/${academy.id}/products`)),
        getDocs(collection(db, `academies/${academy.id}/groups`)),
        getDocs(collection(db, `academies/${academy.id}/tutors`)),
        getDocs(collection(db, `academies/${academy.id}/locations`)),
        getDocs(query(collection(db, `academies/${academy.id}/players`))),
      ]);

      // Process and cache Tiers
      const tiersData = tiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tiersMap = new Map(tiersData.map(tier => [tier.id, tier]));
      const tiersNameMap = new Map(tiersData.map(tier => [tier.id, tier.name]));
      setTiers(tiersData);
      setTiersCache(tiersMap);

      // Process and cache Trials
      const trialsData = trialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const trialsMap = new Map(trialsData.map(trial => [trial.id, trial]));
      setTrialsCache(trialsMap);

      // Process and cache Products
      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const productsMap = new Map(productsData.map(product => [product.id, product]));
      setProductsCache(productsMap);

      // Process and cache Groups
      const groupsData = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const groupsMap = new Map(groupsData.map(group => [group.id, group.name]));
      setGroups(groupsData);
      setGroupsCache(new Map(groupsData.map(group => [group.id, group])));

      // Process and cache Locations
      const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const locationsMap = new Map(locationsData.map(location => [location.id, location.name]));
      setLocationsCache(new Map(locationsData.map(location => [location.id, location])));

      // Process and cache Tutors
      const tutorsMap = new Map(
        tutorsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }])
      );

      // Process Players (no more individual tutor queries!)
      const playersData = playersSnapshot.docs.map(playerDoc => {
        const player = { id: playerDoc.id, ...playerDoc.data() };

        // Get tutor from cache
        if (player.tutorId) {
          player.tutor = tutorsMap.get(player.tutorId) || null;
        }

        // Calculate age
        if (player.birthday) {
          player.age = calculateAge(player.birthday);
        }

        // Get tier name
        if (player.plan && player.plan.type === 'tier') {
          player.tierName = tiersNameMap.get(player.plan.id) || 'N/A';
        }

        // Get group name
        if (player.groupId) {
          player.groupName = groupsMap.get(player.groupId) || 'N/A';
        }

        // Get location name
        if (player.locationId) {
          player.locationName = locationsMap.get(player.locationId) || 'N/A';
        }

        // Calculate payment status
        if (player.oneTimeProducts && player.oneTimeProducts.length > 0) {
          const hasUnpaid = player.oneTimeProducts.some(p => p.status === 'unpaid' && p.dueDate && new Date(p.dueDate.seconds ? p.dueDate.seconds * 1000 : p.dueDate) < new Date());
          player.paymentStatus = hasUnpaid ? 'Overdue' : 'Paid';
        } else {
          player.paymentStatus = 'N/A';
        }

        return player;
      });

      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [tiers, setTiers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [filters, setFilters] = useState({ gender: [], group: [], tier: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // To control which row's menu is open
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const genders = useMemo(() => [...new Set(players.map(p => p.gender).filter(Boolean))], [players]);
  
  const activeFilterCount = useMemo(() => {
    return filters.gender.length + filters.group.length + filters.tier.length;
  }, [filters]);

  const filteredAndSortedPlayers = useMemo(() => {
    let filteredPlayers = [...players];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Apply search and multi-select filters
    filteredPlayers = filteredPlayers.filter(player => {
      const searchMatch = normalizedQuery
        ? `${player.name} ${player.lastName}`.toLowerCase().includes(normalizedQuery) ||
          (player.studentId || '').toLowerCase().includes(normalizedQuery)
        : true;
      
      const genderMatch = filters.gender.length > 0 ? filters.gender.includes(player.gender) : true;
      const groupMatch = filters.group.length > 0 ? filters.group.includes(player.groupId) : true;
      const tierMatch = filters.tier.length > 0 ? (player.plan?.type === 'tier' && filters.tier.includes(player.plan.id)) : true;

      return searchMatch && genderMatch && groupMatch && tierMatch;
    });

    // Apply sorting
    if (sortConfig.key !== null) {
        filteredPlayers.sort((a, b) => {
            const aVal = (a[sortConfig.key] ?? '').toString().toLowerCase();
            const bVal = (b[sortConfig.key] ?? '').toString().toLowerCase();
            if (aVal < bVal) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return filteredPlayers;
  }, [players, filters, sortConfig, searchQuery]);

  useEffect(() => {
    // 3. Lógica de permisos ANTES de llamar a fetchPlayers
    if (!academy || !db || !membership) {
      setLoading(false);
      return;
    }

    // Si el rol del usuario no tiene permisos, no hacemos la consulta.
    if (!hasValidMembership(membership)) {
      setError(`You don't have permission to view ${studentLabelPlural.toLowerCase()}.`);
      setPlayers([]);
      setLoading(false);
      return;
    }

    fetchPlayers();
  }, [academy?.id, db, membership?.role]); // Optimized: only reload when academy ID or membership role changes

  // Refresh players when returning to /students from edit/new pages
  useEffect(() => {
    if (location.pathname === '/students' && academy?.id && db && membership && hasValidMembership(membership)) {
      fetchPlayers();
    }
  }, [location.pathname]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleClearFilters = () => {
    setFilters({ gender: [], group: [], tier: [] });
    setSearchQuery('');
  };

  const handleFilterToggle = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prevFilters, [filterName]: newValues };
    });
  };

  const navigate = useNavigate();

  const handleAddPlayer = () => {
    navigate('/students/new');
  };

  const handleCloseDetailDrawer = () => {
    setIsDetailDrawerAnimating(false);
    setTimeout(() => {
      setIsDetailDrawerOpen(false);
      setSelectedPlayer(null);
    }, 300);
  };

  const handlePlayerUpdated = async () => {
    // Refresh the player list and the selected player details
    await fetchPlayers();
    if (selectedPlayer) {
      await fetchPlayerDetail(selectedPlayer.id);
    }
    setDrawerMode('detail');
  };

  const handleEditPlayer = () => {
    if (selectedPlayer) {
      navigate(`/students/${selectedPlayer.id}/edit`);
    }
  };

  const uploadReceiptFile = async (file, targetPlayerId) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Receipt must be an image or PDF.');
    }
    if (file.size > maxSize) {
      throw new Error('Receipt must be smaller than 5MB.');
    }
    if (!academy?.id) {
      throw new Error('Academy not available.');
    }

    const sanitizedFilename = sanitizeFilename(file.name);
    const storagePath = `academies/${academy.id}/payment_receipts/${targetPlayerId}/${Date.now()}_${sanitizedFilename}`;
    const uploadRef = storageRef(storage, storagePath);
    await uploadBytes(uploadRef, file);
    const receiptUrl = await getDownloadURL(uploadRef);

    return {
      receiptUrl,
      receiptPath: storagePath,
      receiptName: file.name,
      receiptType: file.type,
    };
  };

  const handleMarkProductAsPaid = async (productIndex, paymentMethod, paymentDate, receiptFile) => {
    if (!selectedPlayer) return;

    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const updatedProducts = [...selectedPlayer.oneTimeProducts];
    let receiptData = null;

    if (receiptFile) {
      try {
        receiptData = await uploadReceiptFile(receiptFile, selectedPlayer.id);
      } catch (error) {
        console.error('Error uploading receipt:', error);
        toast.error(error.message || 'Failed to upload receipt.');
        return;
      }
    }

    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      status: 'paid',
      paymentMethod: paymentMethod,
      paidAt: paidDate,
      ...(receiptData || {}),
    };

    const finalProductsForDB = updatedProducts.map(p => {
      const cleanProduct = { ...p };
      delete cleanProduct.productDetails;
      delete cleanProduct.originalIndex;
      delete cleanProduct.tierDetails;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${academy.id}/players`, selectedPlayer.id);
    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      setActiveTab('finances');
      await fetchPlayerDetail(selectedPlayer.id);
      toast.success('Payment registered successfully!');
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error('Failed to register payment.');
    }
  };

  const handleRemoveProduct = async (productIndex) => {
    if (!selectedPlayer) return;

    const updatedProducts = selectedPlayer.oneTimeProducts.filter((_, index) => index !== productIndex);
    const finalProductsForDB = updatedProducts.map(p => {
      const cleanProduct = { ...p };
      delete cleanProduct.productDetails;
      delete cleanProduct.originalIndex;
      delete cleanProduct.tierDetails;
      return cleanProduct;
    });

    const playerRef = doc(db, `academies/${academy.id}/players`, selectedPlayer.id);

    try {
      await updateDoc(playerRef, { oneTimeProducts: finalProductsForDB });
      setActiveTab('finances');
      await fetchPlayerDetail(selectedPlayer.id);
      toast.success('Item removed successfully!');
    } catch (error) {
      console.error("Error removing product:", error);
      toast.error('Failed to remove item.');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    const deleteAction = async () => {
      try {
        // Fetch latest player to get photoPath (if any)
        const playerSnapshot = await getDoc(doc(db, `academies/${academy.id}/players`, playerId));
        const playerData = playerSnapshot.exists() ? playerSnapshot.data() : null;

        await deleteDoc(doc(db, `academies/${academy.id}/players`, playerId));
        if (playerData?.photoPath) {
          try {
            await deleteObject(storageRef(storage, playerData.photoPath));
          } catch (storageErr) {
            console.warn("Failed to delete player photo from storage", storageErr);
          }
        }
        fetchPlayers();
        toast.success(`${studentLabelSingular} deleted successfully.`);
      } catch (error) {
        console.error("Error deleting student:", error);
        toast.error(`Error deleting ${studentLabelSingular.toLowerCase()}.`);
      }
    }

    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete this {studentLabelSingular.toLowerCase()}?</p>
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

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedPlayers.size === filteredAndSortedPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filteredAndSortedPlayers.map(p => p.id)));
    }
  };

  const handleSelectPlayer = (playerId) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  // Bulk actions
  const handleBulkAssignGroup = async (groupId) => {
    if (selectedPlayers.size === 0) return;

    const loadingToast = toast.loading(`Assigning group to ${selectedPlayers.size} ${studentLabelPlural.toLowerCase()}...`);

    try {
      const playerIds = Array.from(selectedPlayers);

      // Process all players in parallel
      await Promise.all(playerIds.map(async (playerId) => {
        const playerRef = doc(db, `academies/${academy.id}/players`, playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const playerData = playerSnap.data();
          const oldGroupId = playerData.groupId;

          // Update player's groupId
          await updateDoc(playerRef, { groupId });

          // Sync group membership
          if (oldGroupId && oldGroupId !== groupId) {
            // Remove from old group
            const oldMemberRef = doc(db, `academies/${academy.id}/groups/${oldGroupId}/members`, playerId);
            await deleteDoc(oldMemberRef);
          }

          if (groupId) {
            // Add to new group
            const newMemberRef = doc(db, `academies/${academy.id}/groups/${groupId}/members`, playerId);
            await setDoc(newMemberRef, { playerId });
          }
        }
      }));

      toast.success(`${selectedPlayers.size} ${studentLabelPlural.toLowerCase()} assigned to group successfully.`, { id: loadingToast });
      setSelectedPlayers(new Set());
      fetchPlayers();
    } catch (error) {
      console.error('Error in bulk assign group:', error);
      toast.error('Failed to assign group to some students.', { id: loadingToast });
    }
  };

  const handleBulkChangeStatus = async (newStatus) => {
    if (selectedPlayers.size === 0) return;

    const loadingToast = toast.loading(`Updating status for ${selectedPlayers.size} ${studentLabelPlural.toLowerCase()}...`);

    try {
      const playerIds = Array.from(selectedPlayers);

      await Promise.all(playerIds.map(async (playerId) => {
        const playerRef = doc(db, `academies/${academy.id}/players`, playerId);
        await updateDoc(playerRef, { status: newStatus });
      }));

      toast.success(`${selectedPlayers.size} ${studentLabelPlural.toLowerCase()} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, { id: loadingToast });
      setSelectedPlayers(new Set());
      fetchPlayers();
    } catch (error) {
      console.error('Error in bulk status change:', error);
      toast.error('Failed to update status for some students.', { id: loadingToast });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlayers.size === 0) return;

    const deleteAction = async () => {
      const loadingToast = toast.loading(`Deleting ${selectedPlayers.size} ${studentLabelPlural.toLowerCase()}...`);

      try {
        const playerIds = Array.from(selectedPlayers);

        await Promise.all(playerIds.map(async (playerId) => {
          const playerSnapshot = await getDoc(doc(db, `academies/${academy.id}/players`, playerId));
          const playerData = playerSnapshot.exists() ? playerSnapshot.data() : null;

          await deleteDoc(doc(db, `academies/${academy.id}/players`, playerId));

          if (playerData?.photoPath) {
            try {
              await deleteObject(storageRef(storage, playerData.photoPath));
            } catch (storageErr) {
              console.warn("Failed to delete player photo from storage", storageErr);
            }
          }
        }));

        toast.success(`${selectedPlayers.size} ${studentLabelPlural.toLowerCase()} deleted successfully.`, { id: loadingToast });
        setSelectedPlayers(new Set());
        fetchPlayers();
      } catch (error) {
        console.error('Error in bulk delete:', error);
        toast.error('Failed to delete some students.', { id: loadingToast });
      }
    };

    toast((t) => (
      <div className="bg-section p-4 rounded-lg shadow-lg flex flex-col items-center">
        <p className="text-center mb-4">Are you sure you want to delete {selectedPlayers.size} {studentLabelPlural.toLowerCase()}?</p>
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

  const handleBulkExport = () => {
    if (selectedPlayers.size === 0) return;

    const selectedPlayersData = players.filter(p => selectedPlayers.has(p.id));

    // Create CSV content
    const headers = ['ID', 'Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Birthday', 'Group', 'Tier', 'Status'];
    const csvContent = [
      headers.join(','),
      ...selectedPlayersData.map(player => [
        player.studentId || '',
        player.name || '',
        player.lastName || '',
        player.email || '',
        player.contactPhone || '',
        player.gender || '',
        player.birthday || '',
        player.groupName || '',
        player.tierName || '',
        player.status || 'active'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${selectedPlayers.size} ${studentLabelPlural.toLowerCase()} exported successfully.`);
  };

  const handleRowClick = async (player) => {
    // Set selected player immediately to prevent visual glitch
    setSelectedPlayer(player);
    setIsDetailDrawerOpen(true);
    setTimeout(() => setIsDetailDrawerAnimating(true), 10);
    setActiveTab('details');
    setPaymentPage(1);
    setDrawerMode('detail');

    // Fetch full player details with all relationships
    await fetchPlayerDetail(player.id);
  };

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
        return null;
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
      list.sort((a, b) => dateFromAny(a.payment.dueDate) - dateFromAny(b.payment.dueDate));
      let lastDueDate = list[list.length - 1].payment.dueDate;
      const tierDetails = list[list.length - 1].tier;

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

  const fetchPlayerDetail = async (playerId) => {
    if (!user || !db || !academy) return;

    setLoadingDetail(true);

    try {
      const academyId = academy.id;

      // Use cached data instead of fetching again
      const playerRef = doc(db, `academies/${academyId}/players`, playerId);
      const playerSnap = await getDoc(playerRef);

      if (playerSnap.exists()) {
        const playerData = { id: playerSnap.id, ...playerSnap.data() };

        if (playerData.tutorId) {
          const tutorRef = doc(db, `academies/${academyId}/tutors`, playerData.tutorId);
          const tutorSnap = await getDoc(tutorRef);
          playerData.tutor = tutorSnap.exists() ? { id: tutorSnap.id, ...tutorSnap.data() } : null;
        }

        if (playerData.groupId) {
          playerData.groupName = groupsCache.get(playerData.groupId)?.name || 'N/A';
        }

        if (playerData.plan) {
          if (playerData.plan.type === 'tier') {
            playerData.planDetails = tiersCache.get(playerData.plan.id);
          } else if (playerData.plan.type === 'trial') {
            playerData.planDetails = trialsCache.get(playerData.plan.id);
          }
        }

        if (playerData.oneTimeProducts) {
          playerData.oneTimeProducts = playerData.oneTimeProducts.map(p => {
            const baseProduct = productsCache.get(p.productId);
            let productDetails = baseProduct;

            // If product exists and uses location pricing, get the correct price for this player's location
            if (baseProduct && playerData.locationId && baseProduct.locationPrices) {
              const locationPrice = baseProduct.locationPrices[playerData.locationId];
              if (locationPrice !== undefined) {
                // Override the price field with location-specific price
                productDetails = {
                  ...baseProduct,
                  price: locationPrice
                };
              }
            }

            return {
              ...p,
              productDetails,
              tierDetails: p.paymentFor === 'tier' ? tiersCache.get(p.itemId) : undefined,
            };
          });
        }

        const updated = await ensureSubscriptionPaymentsAreCurrent(playerData, tiersCache, playerRef);
        if (updated) {
          setLoadingDetail(false);
          await fetchPlayerDetail(playerId);
          return;
        }

        setSelectedPlayer(playerData);
      }
    } catch (error) {
      console.error("Error fetching player details:", error);
      toast.error(`Failed to load ${studentLabelSingular.toLowerCase()} details.`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedPlayerForActions, setSelectedPlayerForActions] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDetailDrawerAnimating, setIsDetailDrawerAnimating] = useState(false);
  const [drawerMode, setDrawerMode] = useState('detail');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [paymentPage, setPaymentPage] = useState(1);

  const handleOpenActionsMenu = (player, event) => {
    event.stopPropagation(); // Prevent row click
    const rect = event.currentTarget.getBoundingClientRect();
    setActionsMenuPosition({
      x: rect.right + window.scrollX, // Left edge of menu aligns with right edge of button
      y: rect.top + window.scrollY,   // Top edge of menu aligns with top edge of button
    });
    setSelectedPlayerForActions(player);
    setShowActionsMenu(true);
  };

  // Custom hook to detect clicks outside a component
  const useOutsideClick = (ref, callback) => {
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          callback();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [ref, callback]);
  };

  // Component for contact icons with a hover-based popover
  const ContactIcon = ({ value, icon: Icon }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef(null);
    const iconRef = useRef(null);

    const handleCopy = (e) => {
      e.stopPropagation(); // Prevent row click
      navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard!');
      setIsPopoverOpen(false);
    };

    const handleMouseEnter = () => {
      clearTimeout(timeoutRef.current);
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setPopoverPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2
        });
      }
      setIsPopoverOpen(true);
    };

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => setIsPopoverOpen(false), 100);
    };

    if (!value) return null;

    return (
      <>
        <div
          ref={iconRef}
          className="relative flex items-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Icon className="h-5 w-5 text-gray-500 cursor-pointer flex-shrink-0" style={{ width: '20px', height: '20px' }} />
        </div>
        {isPopoverOpen && (
          <div
            className="fixed bg-gray-dark text-white rounded-md py-1.5 px-3 shadow-lg whitespace-nowrap"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999
            }}
            onMouseEnter={() => clearTimeout(timeoutRef.current)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2">
              <span className="max-w-[250px] truncate">{value}</span>
              <button onClick={handleCopy} className="text-gray-300 hover:text-white flex-shrink-0"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-dark"></div>
          </div>
        )}
      </>
    );
  };

  const FilterMenu = () => {
    const menuRef = useRef(null);
    useOutsideClick(menuRef, () => setIsFilterMenuOpen(false));

    const filterOptions = [
      { name: 'By Gender', key: 'gender', items: genders.map(g => ({ label: g, value: g })) },
      { name: 'By Group', key: 'group', items: groups.map(g => ({ label: g.name, value: g.id })) },
      { name: 'By Tier', key: 'tier', items: tiers.map(t => ({ label: t.name, value: t.id })) },
    ];

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className={`flex items-center px-4 py-2 border rounded-md transition-colors duration-150 ${
            activeFilterCount > 0
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-section border-gray-border hover:bg-gray-100'
          }`}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {isFilterMenuOpen && (
          <div
            className="absolute left-0 mt-2 w-56 bg-section border border-gray-border rounded-md shadow-lg z-20"
            onMouseLeave={() => setActiveSubMenu(null)}
          >
            <ul className="py-1">
              {filterOptions.map(option => (
                <li
                  key={option.key}
                  className="relative"
                  onMouseEnter={() => setActiveSubMenu(option.key)}
                >
                  <div className="px-4 py-2 hover:bg-gray-100 flex justify-between items-center cursor-default transition-colors duration-150">
                    <span>{option.name}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>

                  {activeSubMenu === option.key && (
                    <div className="absolute left-full top-0 mt-[-0.25rem] ml-1 w-56 bg-section border border-gray-border rounded-md shadow-lg">
                      <ul className="py-1 max-h-60 overflow-y-auto">
                        {option.items.map(item => (
                          <li key={item.value}>
                            <button
                              onClick={() => handleFilterToggle(option.key, item.value)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center transition-colors duration-150"
                            >
                              <div className="w-5 mr-2">
                                {filters[option.key].includes(item.value) && (
                                  <Check className="h-4 w-4" />
                                )}
                              </div>
                              <span>{item.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };


  const Avatar = ({ player }) => {
    if (player.photoURL) {
      // Use thumbnail (72x72) for table rows, fallback to original
      const photoSrc = player.photoThumbnailURL || player.photoURL;
      return <img src={photoSrc} alt={studentLabelSingular} className="w-9 h-9 rounded-full object-cover" />;
    }

    const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

    return (
      <div className="w-9 h-9 rounded-full bg-app flex items-center justify-center">
        <span className="text-lg font-bold text-gray-dark">{initial}</span>
      </div>
    );
  };

  const ActionsMenu = ({ player, position, onClose }) => {
    const menuRef = useRef(null);
    useOutsideClick(menuRef, onClose);

    const style = {
      top: `${position.y}px`,
      left: `${position.x}px`,
      transform: 'translateX(-100%)', // This will align the menu's right edge with the button's right edge
    };

    return (
      <div className="fixed bg-section border border-gray-border rounded-md shadow-lg z-50" ref={menuRef} style={style}>
        <button
          onClick={(e) => { // This button is now inside the fixed menu, so it's not the trigger anymore
            e.stopPropagation();
            // No need to toggle activeMenu here, it's handled by the parent button
          }}
          className="hidden" // Hide the MoreVertical icon here, it's on the table row now
        >
          <MoreVertical className="h-5 w-5 text-gray-500" /> {/* This icon is now just a placeholder for the button */}
        </button>
            <ul className="py-1">
              <li className="text-base">
                <button onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/students/${player.id}/edit`);
                  onClose();
                }} className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center transition-colors duration-150">
                  <Edit className="mr-3 h-4 w-4" />
                  <span>Edit</span>
                </button>
              </li>
              <li className="text-base">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const newStatus = player.status === 'inactive' ? 'active' : 'inactive'; // Corregir la ruta aquí también
                      await updateDoc(doc(db, `academies/${academy.id}/players`, player.id), { status: newStatus });
                      toast.success(`${studentLabelSingular} ${newStatus === 'inactive' ? 'deactivated' : 'activated'} successfully.`);
                      fetchPlayers();
                      onClose();
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to update status.');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center transition-colors duration-150"
                >
                  <X className="mr-3 h-4 w-4" />
                  <span>{player.status === 'inactive' ? 'Activate' : 'Deactivate'}</span>
                </button>
              </li>
              <li className="text-base">
                <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center transition-colors duration-150">
                  <Trash2 className="mr-3 h-4 w-4" />
                  <span>Delete</span>
                </button>
              </li>
            </ul>
      </div>
    );
  };

  const BulkActionsToolbar = () => {
    const menuRef = useRef(null);
    useOutsideClick(menuRef, () => setShowBulkActionsMenu(false));

    return (
      <div className="flex items-center mb-4 bg-primary rounded-lg h-[72px]">
        <button
          onClick={() => setSelectedPlayers(new Set())}
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors ml-2"
          aria-label="Clear selection"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center ml-2">
          <span className="text-white font-medium">{selectedPlayers.size} {studentLabelPlural.toLowerCase()} selected</span>
        </div>
        <div className="flex-grow"></div>
        <div className="relative mr-2" ref={menuRef}>
          <button
            onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
            className="bg-white text-primary px-4 py-2 rounded-md hover:bg-gray-100 font-medium transition-colors duration-150"
          >
            Actions
          </button>
          {showBulkActionsMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-section border border-gray-border rounded-md shadow-lg z-50">
              <ul className="py-1">
                <li>
                  <button
                    onClick={() => {
                      handleBulkExport();
                      setShowBulkActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center transition-colors duration-150"
                  >
                    <Download className="mr-3 h-4 w-4" />
                    <span>Download CSV</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="section-container">
      <div className="section-content-wrapper space-y-6">
        {/* Header with title */}
        <div className="flex justify-between items-center">
          <h2 className="section-title">{studentLabelPlural} of {academy.name}</h2>
        </div>

      <div className="content-card-responsive">
      <LoadingBar loading={loading} />

      {/* Search, Filters, and Add Button OR Bulk Actions Toolbar */}
      {selectedPlayers.size > 0 ? (
        <BulkActionsToolbar />
      ) : (
        <div className="flex items-center mb-4 bg-app rounded-lg h-[72px]">
          <div className="relative" style={{ width: '280px' }}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="searchFilter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${players.length} ${players.length === 1 ? studentLabelSingular : studentLabelPlural}...`}
              className="block w-full pl-10 pr-3 py-2 border border-gray-border focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            />
          </div>
          <div className="flex items-center ml-2 space-x-4">
            <FilterMenu />
            {(activeFilterCount > 0 || searchQuery) && (
              <button onClick={handleClearFilters} className="flex items-center text-sm text-red-600 hover:underline transition-colors duration-150">
                <X className="h-4 w-4 mr-1" />
                Clear
              </button>
            )}
          </div>
          <div className="flex-grow"></div>
          <button
            onClick={handleAddPlayer}
            className="btn-primary whitespace-nowrap transition-colors duration-150"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span>New {studentLabelSingular}</span>
          </button>
        </div>
      )}
      {loading ? (
        <p>Loading {studentLabelPlural.toLowerCase()}...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : filteredAndSortedPlayers.length === 0 ? (
        <p className="text-gray-600">No {studentLabelPlural.toLowerCase()} registered yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full bg-section">
              <thead>
                <tr className="h-14">
                  <th className="px-4 border-b text-left table-header w-12">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.size === filteredAndSortedPlayers.length && filteredAndSortedPlayers.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-primary border-gray-300 rounded"
                      />
                    </div>
                  </th>
                  <th className="pr-4 border-b text-left table-header">
                    <button onClick={() => handleSort('name')} className="table-header flex items-center">
                      {studentLabelSingular} {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                    </button>
                  </th>
                  <th className="px-4 border-b text-left table-header">Group</th>
                  <th className="px-4 border-b text-left table-header">Location</th>
                  <th className="px-4 border-b text-left table-header">Payment Status</th>
                  <th className="px-4 border-b text-right table-header"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPlayers.map(player => (
                  <tr
                    key={player.id}
                    className={`h-14 group cursor-pointer table-row-hover ${selectedPlayer?.id === player.id ? 'table-row-active' : ''}`}
                    onClick={() => handleRowClick(player)}
                  >
                    <td className="px-4 border-b table-cell w-12" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(player.id)}
                          onChange={() => handleSelectPlayer(player.id)}
                          className="h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="pr-4 border-b table-cell">
                      <div className="flex items-center space-x-4">
                        <Avatar player={player} />
                        <span className="font-medium text-gray-800 table-cell-truncate">{player.name} {player.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 border-b table-cell">
                      <span className="table-cell-truncate">{player.groupName || 'N/A'}</span>
                    </td>
                    <td className="px-4 border-b table-cell">
                      <span className="table-cell-truncate">{player.locationName || 'N/A'}</span>
                    </td>
                    <td className="px-4 border-b table-cell">
                      <span className={`table-cell-truncate ${player.paymentStatus === 'Overdue' ? 'text-red-600 font-medium' : player.paymentStatus === 'Paid' ? 'text-green-600 font-medium' : ''}`}>
                        {player.paymentStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 border-b text-right table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {player.contactPhone && (
                          <div className="w-9 h-9 flex items-center justify-center relative transition-colors duration-150">
                            <ContactIcon value={player.contactPhone} icon={Phone} />
                          </div>
                        )}
                        {player.email && (
                          <div className="w-9 h-9 flex items-center justify-center relative transition-colors duration-150">
                            <ContactIcon value={player.email} icon={Mail} />
                          </div>
                        )}
                        <div className="w-9 h-9 flex items-center justify-center">
                          <button
                            onClick={(e) => handleOpenActionsMenu(player, e)}
                            className="p-2 rounded-full hover:bg-gray-200 focus:outline-none transition-colors duration-150"
                            aria-label={`Actions for ${player.name} ${player.lastName}`}
                          >
                            <MoreVertical className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filteredAndSortedPlayers.map(player => {
              const playerPhone = player.contactPhone || player.contactPhoneNumber || '';
              return (
                <div
                  key={player.id}
                  className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm relative"
                  onClick={() => handleRowClick(player)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlayers.has(player.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectPlayer(player.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 left-3 h-5 w-5 text-primary border-gray-300 rounded"
                  />
                  <button
                    onClick={(e) => handleOpenActionsMenu(player, e)}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="flex items-center space-x-3 ml-8">
                    <Avatar player={player} />
                    <div>
                      <p className="font-semibold text-gray-900">{player.name} {player.lastName}</p>
                      <p className="text-xs text-gray-500">ID: {player.studentId || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{player.email || 'No email'}</p>
                      {playerPhone && <p className="text-sm text-gray-500">{playerPhone}</p>}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500">Gender</p>
                      <p className="font-medium">{player.gender || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500">Group</p>
                      <p className="font-medium truncate">{player.groupName || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500">Tier</p>
                      <p className="font-medium truncate">{player.tierName || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500">Tutor</p>
                      <p className="font-medium truncate">{player.tutor ? `${player.tutor.name} ${player.tutor.lastName}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showActionsMenu && selectedPlayerForActions && (
        <ActionsMenu
          player={selectedPlayerForActions}
          position={actionsMenuPosition}
          onClose={() => setShowActionsMenu(false)}
        />
      )}
      </div>
      </div>

      {/* Drawer Overlay - Student Detail */}
      {isDetailDrawerOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-out ${isDetailDrawerAnimating ? 'opacity-32' : 'opacity-0'}`}
            onClick={handleCloseDetailDrawer}
            style={{ opacity: isDetailDrawerAnimating ? 0.32 : 0 }}
          />
          <div
            id="player-form-drawer"
            className={`fixed top-0 right-0 h-full w-full bg-app shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ${isDetailDrawerAnimating ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', maxWidth: '584px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}
          >
            <div className="bg-app px-6 pt-6 pb-4">
              {selectedPlayer && (
                <div className="relative">
                  <div className="flex items-center gap-4">
                    {selectedPlayer.photoURL ? (
                      <img src={selectedPlayer.photoMediumURL || selectedPlayer.photoURL} alt={studentLabelSingular} className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full bg-app flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-bold text-gray-dark">
                          {selectedPlayer.name ? selectedPlayer.name.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-800 truncate leading-8" style={{ fontSize: '24px', height: '32px' }}>
                        {selectedPlayer.name} {selectedPlayer.lastName}
                      </h2>
                      <p className="text-gray-600 leading-6" style={{ fontSize: '16px', height: '24px' }}>
                        {selectedPlayer.groupName || 'No group'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEditPlayer}
                    className="absolute top-0 right-0 px-4 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors duration-150"
                    style={{ height: '36px' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            {loadingDetail || !selectedPlayer ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-gray-600">Loading {studentLabelSingular.toLowerCase()} details...</p>
                </div>
              </div>
            ) : (
              <PlayerDetail
                player={selectedPlayer}
                onMarkAsPaid={handleMarkProductAsPaid}
                onRemoveProduct={handleRemoveProduct}
                academy={academy}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                paymentPage={paymentPage}
                onPaymentPageChange={setPaymentPage}
              />
            )}
            <div id="player-form-modal-root"></div>
          </div>
        </>
      )}
    </div>
  );
}
