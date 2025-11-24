import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';

export default function PaymentsSection({ user, academy, db }) {
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('unpaid');

    useEffect(() => {
        const fetchAllPayments = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // Fetch all necessary data in parallel
                const productsRef = collection(db, `academies/${user.uid}/products`);
                const playersRef = collection(db, `academies/${user.uid}/players`);

                const [productsSnap, playersSnap] = await Promise.all([
                    getDocs(productsRef),
                    getDocs(playersRef)
                ]);

                const productsMap = new Map(productsSnap.docs.map(doc => [doc.id, doc.data()]));
                
                let paymentsList = [];
                playersSnap.forEach(playerDoc => {
                    const playerData = playerDoc.data();
                    const playerName = `${playerData.name} ${playerData.lastName}`;
                    const playerId = playerDoc.id;

                    if (playerData.oneTimeProducts && Array.isArray(playerData.oneTimeProducts)) {
                        playerData.oneTimeProducts.forEach(paymentItem => {
                            let details = {
                                studentId: playerId,
                                studentName: playerName,
                                status: paymentItem.status,
                                paidAt: paymentItem.paidAt,
                                paymentMethod: paymentItem.paymentMethod,
                            };

                            if (paymentItem.paymentFor === 'tier') {
                                details.itemName = paymentItem.itemName;
                                details.amount = paymentItem.amount;
                                details.dueDate = paymentItem.dueDate;
                            } else {
                                const productInfo = productsMap.get(paymentItem.productId);
                                details.itemName = productInfo?.name || 'Product not found';
                                details.amount = productInfo?.price || 0;
                                // One-time products don't have a due date unless specified, so we can leave it null
                            }
                            paymentsList.push(details);
                        });
                    }
                });
                setAllPayments(paymentsList);
            } catch (error) {
                console.error("Error fetching payments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPayments();
    }, [user, db]);

    const { unpaidPayments, paidPayments } = useMemo(() => {
        const unpaid = allPayments.filter(p => p.status === 'unpaid');
        const paid = allPayments.filter(p => p.status === 'paid');

        // Sort unpaid: those with due dates first, then by date, then those without due dates
        unpaid.sort((a, b) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1; // a has a due date, b doesn't, so a comes first
            if (b.dueDate) return 1;  // b has a due date, a doesn't, so b comes first
            return 0; // neither has a due date
        });

        // Sort paid by paidAt date, descending
        paid.sort((a, b) => new Date(b.paidAt?.seconds * 1000) - new Date(a.paidAt?.seconds * 1000));

        return { unpaidPayments: unpaid, paidPayments: paid };
    }, [allPayments]);

    const formatCurrency = (price) => {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(price);
        } catch (e) {
            return `$${Number(price).toFixed(2)}`;
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.seconds) { // It's a Firestore Timestamp
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return new Date(date).toLocaleDateString(); // It's a string date like 'YYYY-MM-DD'
    };

    const renderTable = (payments, isPaidTab = false) => (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b text-left">Student</th>
                        <th className="py-2 px-4 border-b text-left">Item</th>
                        <th className="py-2 px-4 border-b text-left">Amount</th>
                        <th className="py-2 px-4 border-b text-left">{isPaidTab ? 'Paid Date' : 'Due Date'}</th>
                        {isPaidTab && <th className="py-2 px-4 border-b text-left">Method</th>}
                    </tr>
                </thead>
                <tbody>
                    {payments.map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-b font-medium">
                                <Link to={`/students/${payment.studentId}`} className="text-primary hover:underline">{payment.studentName}</Link>
                            </td>
                            <td className="py-3 px-4 border-b">{payment.itemName}</td>
                            <td className="py-3 px-4 border-b">{formatCurrency(payment.amount)}</td>
                            <td className="py-3 px-4 border-b">{formatDate(isPaidTab ? payment.paidAt : payment.dueDate)}</td>
                            {isPaidTab && <td className="py-3 px-4 border-b">{payment.paymentMethod}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payments</h2>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('unpaid')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'unpaid' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <Clock className="mr-2 h-5 w-5" /> Unpaid
                    </button>
                    <button onClick={() => setActiveTab('paid')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'paid' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <CheckCircle className="mr-2 h-5 w-5" /> Paid
                    </button>
                </nav>
            </div>

            {loading ? (
                <p>Loading payments...</p>
            ) : (
                <div>
                    {activeTab === 'unpaid' && (unpaidPayments.length > 0 ? renderTable(unpaidPayments, false) : <p>No unpaid payments.</p>)}
                    {activeTab === 'paid' && (paidPayments.length > 0 ? renderTable(paidPayments, true) : <p>No paid payments yet.</p>)}
                </div>
            )}
        </div>
    );
}