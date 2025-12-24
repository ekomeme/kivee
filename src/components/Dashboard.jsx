import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Users, Activity, Mail } from 'lucide-react';
import { useAcademy } from '../contexts/AcademyContext';
import { formatAcademyCurrency, toDateSafe } from '../utils/formatters';
import { hasValidMembership } from '../utils/permissions';
import '../styles/sections.css';

// Skeleton components for loading states
const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const StatsSkeleton = () => (
  <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-3">
    <SkeletonBox className="h-6 w-32" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i}>
          <SkeletonBox className="h-4 w-24 mb-2" />
          <SkeletonBox className="h-8 w-16 mt-1" />
        </div>
      ))}
    </div>
  </section>
);

const TableSkeleton = () => (
  <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-3">
    <SkeletonBox className="h-6 w-32 mb-3" />
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex justify-between items-center py-2">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-4 w-16" />
        </div>
      ))}
    </div>
    <div className="pt-2 space-y-2">
      <SkeletonBox className="h-4 w-24" />
      <SkeletonBox className="h-6 w-12" />
      <SkeletonBox className="h-4 w-32" />
    </div>
  </section>
);

const FinanceSkeleton = () => (
  <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-4">
    <SkeletonBox className="h-6 w-24 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i}>
          <SkeletonBox className="h-4 w-28 mb-2" />
          <SkeletonBox className="h-8 w-24 mt-1" />
        </div>
      ))}
    </div>
    <div>
      <SkeletonBox className="h-4 w-48 mb-2" />
      <div className="grid grid-cols-6 gap-3 items-end h-40">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col items-center h-32 justify-end">
            <SkeletonBox className={`w-full h-${20 + i * 5}`} />
            <SkeletonBox className="h-3 w-8 mt-1" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default function Dashboard({ user, db, pendingInvites = [], onAcceptInvite, onDeclineInvite, isAcceptingInvite }) {
  const { academy, membership, studentLabelPlural, studentLabelSingular } = useAcademy();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());
  const [tiers, setTiers] = useState([]);
  const [trialsMap, setTrialsMap] = useState(new Map());
  const [inviteAcademyNames, setInviteAcademyNames] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db || !academy || !membership) {
        setLoading(false);
        return;
      }
      if (!hasValidMembership(membership)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [productsSnap, playersSnap, trialsSnap, tiersSnap] = await Promise.all([
          getDocs(collection(db, `academies/${academy.id}/products`)),
          getDocs(collection(db, `academies/${academy.id}/players`)),
          getDocs(collection(db, `academies/${academy.id}/trials`)),
          getDocs(collection(db, `academies/${academy.id}/tiers`)),
        ]);

        setProductsMap(new Map(productsSnap.docs.map(doc => [doc.id, doc.data()])));
        setTrialsMap(new Map(trialsSnap.docs.map(doc => [doc.id, doc.data()])));
        setTiers(tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setPlayers(playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [academy?.id, db, membership?.role]); // Optimized: only reload when academy ID or membership role changes

  // Fetch academy names for pending invites (in parallel)
  useEffect(() => {
    const fetchInviteAcademyNames = async () => {
      if (!pendingInvites || pendingInvites.length === 0) return;

      // Fetch all academy names in parallel instead of sequentially
      const namePromises = pendingInvites.map(async (invite) => {
        try {
          const academyRef = doc(db, 'academies', invite.academyId);
          const academySnap = await getDoc(academyRef);
          return {
            academyId: invite.academyId,
            name: academySnap.exists() ? (academySnap.data().name || invite.academyId) : invite.academyId
          };
        } catch (err) {
          console.error(`Error fetching academy name for ${invite.academyId}:`, err);
          return { academyId: invite.academyId, name: invite.academyId };
        }
      });

      const results = await Promise.all(namePromises);
      const names = {};
      results.forEach(({ academyId, name }) => {
        names[academyId] = name;
      });
      setInviteAcademyNames(names);
    };

    fetchInviteAcademyNames();
  }, [pendingInvites?.length, db]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const payments = useMemo(() => {
    const list = [];
    players.forEach(p => {
      (p.oneTimeProducts || []).forEach(item => {
        const isSubscription = item.paymentFor === 'tier';
        const amount = isSubscription ? (item.amount || 0) : (productsMap.get(item.productId)?.price || 0);
        list.push({ ...item, amount });
      });
    });
    return list;
  }, [players, productsMap]);

  const financeStats = useMemo(() => {
    const incomesMonth = payments
      .filter(p => {
        if (p.status !== 'paid') return false;
        const paidDate = toDateSafe(p.paidAt);
        return paidDate && paidDate >= startOfMonth;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const unpaidAmount = payments
      .filter(p => p.status === 'unpaid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
    return { incomesMonth, unpaidAmount, unpaidCount };
  }, [payments, startOfMonth]);

  const studentStats = useMemo(() => {
    const active = players.filter(p => p.status !== 'inactive').length;
    const newThisMonth = players.filter(p => p.createdAt?.seconds && new Date(p.createdAt.seconds * 1000) >= startOfMonth).length;
    const canceledThisMonth = players.filter(p => p.status === 'inactive' && p.updatedAt?.seconds && new Date(p.updatedAt.seconds * 1000) >= startOfMonth).length || 0;
    return { active, newThisMonth, canceledThisMonth };
  }, [players, startOfMonth]);

  const trialStats = useMemo(() => {
    const activeTrials = players.filter(p => p.plan?.type === 'trial');
    const expiringSoon = activeTrials.filter(p => {
      const trialData = trialsMap.get(p.plan.id);
      if (!trialData?.durationInDays) return false;
      const start = p.plan.startDate ? new Date(p.plan.startDate) : new Date();
      const end = new Date(start);
      end.setDate(start.getDate() + Number(trialData.durationInDays));
      const diff = (end - now) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    });
    return { active: activeTrials.length, expiringSoon: expiringSoon.length };
  }, [players, trialsMap, now]);

  const chartData = useMemo(() => {
    const months = [];
    const ref = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ label: d.toLocaleString('default', { month: 'short' }), key, value: 0 });
    }
    const map = new Map(months.map(m => [m.key, m]));
    payments.forEach(p => {
      if (p.status === 'paid') {
        const d = toDateSafe(p.paidAt);
        if (!d) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (map.has(key)) {
            const amt = Number(p.amount || 0);
            if (Number.isFinite(amt)) {
              map.get(key).value += amt;
            }
        }
      }
    });
    return months;
  }, [payments, now]);

  const maxValue = Math.max(...chartData.map(c => Number.isFinite(c.value) ? c.value : 0), 1);
  const hasChartData = chartData.some(c => c.value > 0);

  const tierSummary = useMemo(() => {
    const counts = new Map();
    tiers.forEach(t => counts.set(t.id, 0));
    players.forEach(p => {
      if (p.plan?.type === 'tier' && counts.has(p.plan.id)) {
        counts.set(p.plan.id, (counts.get(p.plan.id) || 0) + 1);
      }
    });
    return tiers.map(t => ({ name: t.name, count: counts.get(t.id) || 0 }));
  }, [tiers, players]);

  return (
    <div className="section-content-wrapper space-y-6 section-container">
      <h1 className="section-title">Dashboard</h1>

      {/* Academy Invitations Banner */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 border border-blue-700 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="bg-section rounded-full p-2 flex-shrink-0">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">You have {pendingInvites.length} academy invitation{pendingInvites.length > 1 ? 's' : ''}!</h3>
              <p className="text-blue-50 mb-4">You've been invited to join {pendingInvites.length > 1 ? 'other academies' : 'another academy'}. Accept to switch between multiple academies.</p>
              <div className="space-y-3">
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="bg-section/10 backdrop-blur-sm border border-white/20 rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{inviteAcademyNames[invite.academyId] || 'Loading...'}</p>
                      <p className="text-sm text-blue-100">Role: {invite.role || 'admin'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onDeclineInvite && onDeclineInvite(invite.id)}
                        className="text-sm text-white hover:text-blue-100 px-3 py-1.5 rounded-md border border-white/30 hover:border-white/50 transition"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptInvite && onAcceptInvite(invite.id)}
                        disabled={isAcceptingInvite}
                        className="text-sm bg-section text-blue-600 hover:bg-blue-50 font-medium px-4 py-1.5 rounded-md disabled:opacity-50 transition shadow-sm"
                      >
                        {isAcceptingInvite ? 'Joining...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <>
          {/* Show skeleton loaders while loading */}
          <StatsSkeleton />
          <TableSkeleton />
          <FinanceSkeleton />
        </>
      ) : (
        <>
          {/* Students */}
          <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">{studentLabelPlural}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Active {studentLabelPlural.toLowerCase()}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {studentStats.active}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">New this month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{studentStats.newThisMonth}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Deactivated this month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{studentStats.canceledThisMonth}</p>
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4 table-header">Plan</th>
                <th className="py-2 pr-4 table-header">Assigned students</th>
              </tr>
            </thead>
            <tbody>
              {tierSummary.map((t, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium text-gray-900 table-cell">{t.name}</td>
                  <td className="py-2 pr-4 text-gray-700 table-cell">{t.count}</td>
                </tr>
              ))}
              {tierSummary.length === 0 && (
                <tr>
                  <td className="py-2 pr-4 text-gray-500 table-cell border-b border-gray-100" colSpan={2}>No subscription plans.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pt-2">
          <p className="text-sm text-gray-600">Active trials</p>
          <p className="text-xl font-bold text-gray-900">{trialStats.active}</p>
          <p className="text-sm text-amber-700">Expiring soon: {trialStats.expiringSoon}</p>
        </div>
      </section>

      {/* Finance */}
      <section className="bg-section border border-gray-200 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Finance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Income this month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatAcademyCurrency(financeStats.incomesMonth, academy)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending to collect</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatAcademyCurrency(financeStats.unpaidAmount, academy)}</p>
          </div>
          <button
            onClick={() => navigate('/finances')}
            className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow transition"
          >
            <p className="text-sm text-gray-600">Unpaid invoices</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">{financeStats.unpaidCount} <AlertCircle className="h-5 w-5 text-amber-600" /></p>
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Income by month (last 6 months)</p>
          {hasChartData ? (
            <div className="grid grid-cols-6 gap-3 items-end h-40">
              {chartData.map((m, idx) => {
                const barHeight = Math.max(4, (m.value / maxValue) * 120); // px height
                return (
                  <div key={idx} className="flex flex-col items-center h-32 justify-end">
                    <span className="text-xs text-gray-700 mb-1">{formatAcademyCurrency(m.value, academy)}</span>
                    <div className="w-full bg-primary rounded-t" style={{ height: `${barHeight}px` }}></div>
                    <p className="text-xs text-gray-600 mt-1">{m.label}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No paid income recorded in the last 6 months.</p>
          )}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
