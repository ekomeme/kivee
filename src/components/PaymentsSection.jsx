import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsSection({ user, academy, db }) {
    const [allPayments, setAllPayments] = useState([]);
    const [showPaymentModalFor, setShowPaymentModalFor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('unpaid');

    const fetchAllPayments = useCallback(async () => {
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
                    playerData.oneTimeProducts.forEach((paymentItem, index) => {
                        let details = {
                            studentId: playerId,
                            studentName: playerName,
                            status: paymentItem.status,
                            paidAt: paymentItem.paidAt,
                            paymentMethod: paymentItem.paymentMethod,
                            originalIndex: index,
                            paymentFor: paymentItem.paymentFor,
                            productId: paymentItem.productId,
                            itemId: paymentItem.itemId,
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
    }, [user, db]);

    useEffect(() => {
        fetchAllPayments();
    }, [fetchAllPayments]);

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

    const renderTable = (payments, isPaidTab = false, onPay = null) => ( 
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b text-left">Student</th>
                        <th className="py-2 px-4 border-b text-left">Item</th>
                        <th className="py-2 px-4 border-b text-left">Amount</th>
                        <th className="py-2 px-4 border-b text-left">{isPaidTab ? 'Paid Date' : 'Due Date'}</th> 
                        {isPaidTab && <th className="py-2 px-4 border-b text-left">Method</th>}
                        {!isPaidTab && <th className="py-2 px-4 border-b text-left">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {payments.map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-b font-medium">
                                <Link to={`/students/${payment.studentId}`} className="text-primary hover:underline">
                                    {payment.studentName}
                                </Link>
                            </td>
                            <td className="py-3 px-4 border-b">{payment.itemName}</td>
                            <td className="py-3 px-4 border-b">{formatCurrency(payment.amount)}</td>
                            <td className="py-3 px-4 border-b">{formatDate(isPaidTab ? payment.paidAt : payment.dueDate)}</td>

                            {isPaidTab && <td className="py-3 px-4 border-b">{payment.paymentMethod}</td>}
                            {!isPaidTab && (
                                <td className="py-3 px-4 border-b">
                                    <button
                                        onClick={() => onPay && onPay(index)}
                                        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-1 px-3 rounded-md flex items-center"
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Add Payment
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const PaymentModal = ({ payment, onClose }) => {
        const [paymentMethod, setPaymentMethod] = useState('Cash');

        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                const playerRef = doc(db, `academies/${user.uid}/players`, payment.studentId);
                const playerDoc = await getDoc(playerRef);
                if (!playerDoc.exists()) {
                    toast.error("Student not found.");
                    return;
                }

                const playerData = playerDoc.data();
                const updatedPayments = playerData.oneTimeProducts.map((p, idx) => {
                    if (idx === payment.originalIndex) {
                        return { ...p, status: 'paid', paidAt: new Date(), paymentMethod: paymentMethod };
                    }
                    return p;
                });

                await updateDoc(playerRef, { oneTimeProducts: updatedPayments });
                toast.success('Payment registered successfully!');
                await fetchAllPayments(); // Refresh list after payment
                onClose();
            } catch (error) {
                console.error("Error updating payment status:", error);
                toast.error('Failed to register payment.');
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                    <h3 className="text-xl font-bold mb-4">Register Payment</h3>
                    <p className="mb-1"><strong>Item:</strong> {payment.itemName}</p>
                    <p className="mb-4"><strong>Amount:</strong> {formatCurrency(payment.amount)}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label><select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option>Cash</option><option>Credit Card</option><option>Bank Transfer</option><option>Other</option></select></div>
                        <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button><button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md">Confirm Payment</button></div>
                    </form>
                </div>
            </div>
        );
    };

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
                    {activeTab === 'unpaid' && (
                        unpaidPayments.length > 0 ? (
                            <>
                                {renderTable(unpaidPayments, false, setShowPaymentModalFor)}
                                {showPaymentModalFor !== null && (
                                    <PaymentModal payment={unpaidPayments[showPaymentModalFor]} onClose={() => setShowPaymentModalFor(null)} />
                                )}
                            </>
                        ) : (
                            <p>No unpaid payments.</p>
                        )
                    )}
                    {activeTab === 'paid' && (
                        paidPayments.length > 0 ? (
                            renderTable(paidPayments, true)
                        ) : (
                            <p>No paid payments yet.</p>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
