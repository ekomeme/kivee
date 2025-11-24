import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function Dashboard({ user, academy, db }) {
  const [loading, setLoading] = useState(true);
  const [unpaidPayments, setUnpaidPayments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !db) return;
      setLoading(true);
      try {
        const productsRef = collection(db, `academies/${user.uid}/products`);
        const playersRef = collection(db, `academies/${user.uid}/players`);

        const [productsSnap, playersSnap] = await Promise.all([
          getDocs(productsRef),
          getDocs(playersRef)
        ]);

        const productsMap = new Map(productsSnap.docs.map(doc => [doc.id, doc.data()]));
        const payments = [];

        playersSnap.forEach(playerDoc => {
          const playerData = playerDoc.data();
          if (Array.isArray(playerData.oneTimeProducts)) {
            playerData.oneTimeProducts.forEach(paymentItem => {
              if (paymentItem.status === 'unpaid') {
                const isSubscription = paymentItem.paymentFor === 'tier';
                const amount = isSubscription
                  ? paymentItem.amount || 0
                  : (productsMap.get(paymentItem.productId)?.price || 0);
                payments.push({ amount });
              }
            });
          }
        });

        setUnpaidPayments(payments);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, db]);

  const totals = useMemo(() => {
    const count = unpaidPayments.length;
    const amount = unpaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { count, amount };
  }, [unpaidPayments]);

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: academy?.currency || 'USD' }).format(value || 0);
    } catch (e) {
      return `$${Number(value || 0).toFixed(2)}`;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/payments')}
          className="text-left bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unpaid invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totals.count}</p>
              <p className="text-sm text-gray-600">Total: {formatCurrency(totals.amount)}</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
          {loading && <p className="text-xs text-gray-500 mt-3">Loading...</p>}
        </button>
      </div>
    </div>
  );
}
