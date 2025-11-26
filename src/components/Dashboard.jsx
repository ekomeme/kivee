import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Users, Activity } from 'lucide-react';

export default function Dashboard({ user, academy, db }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());
  const [tiers, setTiers] = useState([]);
  const [trialsMap, setTrialsMap] = useState(new Map());
  const navigate = useNavigate();
  const studentLabelPlural = academy?.studentLabelPlural || 'Students';
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db) return;
      setLoading(true);
      try {
        const [productsSnap, playersSnap, trialsSnap, tiersSnap] = await Promise.all([
          getDocs(collection(db, `academies/${user.uid}/products`)),
          getDocs(collection(db, `academies/${user.uid}/players`)),
          getDocs(collection(db, `academies/${user.uid}/trials`)),
          getDocs(collection(db, `academies/${user.uid}/tiers`)),
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
  }, [user, db]);

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: academy?.currency || 'USD' }).format(value || 0);
    } catch (e) {
      return `$${Number(value || 0).toFixed(2)}`;
    }
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const toDateSafe = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (d?.seconds) return new Date(d.seconds * 1000);
    const parsed = new Date(d);
    return isNaN(parsed) ? null : parsed;
  };

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
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Students */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
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
      <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Assigned students</th>
              </tr>
            </thead>
            <tbody>
              {tierSummary.map((t, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="py-2 pr-4 font-medium text-gray-900">{t.name}</td>
                  <td className="py-2 pr-4 text-gray-700">{t.count}</td>
                </tr>
              ))}
              {tierSummary.length === 0 && (
                <tr>
                  <td className="py-2 pr-4 text-gray-500" colSpan={2}>No subscription plans.</td>
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
      <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Finance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Income this month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(financeStats.incomesMonth)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending to collect</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(financeStats.unpaidAmount)}</p>
          </div>
          <button
            onClick={() => navigate('/payments')}
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
                    <span className="text-xs text-gray-700 mb-1">{formatCurrency(m.value)}</span>
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
    </div>
  );
}
