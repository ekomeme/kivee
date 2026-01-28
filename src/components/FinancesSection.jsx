import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, FileText, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingBar from './LoadingBar.jsx';
import '../styles/sections.css';
import { useAcademy } from '../contexts/AcademyContext';
import { hasValidMembership } from '../utils/permissions';
import { formatAcademyCurrency } from '../utils/formatters';
import { COLLECTIONS } from '../config/constants';
import { sanitizeFilename } from '../utils/validators';

export default function FinancesSection({ user, db }) {
    const { academy, membership, studentLabelPlural } = useAcademy();
    const [allPayments, setAllPayments] = useState([]);
    const [showPaymentModalFor, setShowPaymentModalFor] = useState(null);
    const touchStartX = useRef(0);
    const touchMoved = useRef(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('unpaid');
    const academyId = academy?.id;

    const fetchAllPayments = useCallback(async () => {
        if (!user || !academyId || !membership) {
            setLoading(false);
            return;
        }
        if (!hasValidMembership(membership)) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            // Fetch all necessary data in parallel
            const productsRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academyId}/${COLLECTIONS.PRODUCTS}`);
            const playersRef = collection(db, `${COLLECTIONS.ACADEMIES}/${academyId}/${COLLECTIONS.PLAYERS}`);

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
                            receiptUrl: paymentItem.receiptUrl,
                            receiptName: paymentItem.receiptName,
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
                            details.itemName = paymentItem.productName || productInfo?.name || 'Product not found';

                            // Try to get amount from saved data first, then from location pricing, then fallback to base price
                            let productAmount = paymentItem.amount;
                            if (!productAmount && productInfo && playerData.locationId && productInfo.locationPrices) {
                                productAmount = productInfo.locationPrices[playerData.locationId];
                            }
                            details.amount = productAmount || productInfo?.price || 0;
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
    }, [user, db, academyId, membership]);

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

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.seconds) { // It's a Firestore Timestamp
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return new Date(date).toLocaleDateString(); // It's a string date like 'YYYY-MM-DD'
    };

    const uploadReceiptFile = async (file, studentId) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Receipt must be an image or PDF.');
        }
        if (file.size > maxSize) {
            throw new Error('Receipt must be smaller than 5MB.');
        }
        if (!academyId) {
            throw new Error('Academy not available.');
        }

        const storage = getStorage();
        const sanitizedFilename = sanitizeFilename(file.name);
        const storagePath = `academies/${academyId}/payment_receipts/${studentId}/${Date.now()}_${sanitizedFilename}`;
        const uploadRef = ref(storage, storagePath);
        await uploadBytes(uploadRef, file);
        const receiptUrl = await getDownloadURL(uploadRef);

        return {
            receiptUrl,
            receiptPath: storagePath,
            receiptName: file.name,
            receiptType: file.type,
        };
    };

    const renderTable = (payments, isPaidTab = false, onPay = null) => ( 
        <>
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full bg-section">
                    <thead>
                        <tr>
                        <th className="py-2 px-4 border-b text-left table-header">{academy?.studentLabelSingular || 'Student'}</th>
                            <th className="py-2 px-4 border-b text-left table-header">Item</th>
                            <th className="py-2 px-4 border-b text-left table-header">Amount</th>
                            <th className="py-2 px-4 border-b text-left table-header">{isPaidTab ? 'Paid Date' : 'Due Date'}</th> 
                            {isPaidTab && <th className="py-2 px-4 border-b text-left table-header">Method</th>}
                            {isPaidTab && <th className="py-2 px-4 border-b text-left table-header">Receipt</th>}
                            {!isPaidTab && <th className="py-2 px-4 border-b text-left table-header">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment, index) => (
                            <tr key={index} className="hover:bg-gray-50 table-row-hover">
                                <td className="py-3 px-4 border-b font-medium table-cell">
                                    <Link to={`/students/${payment.studentId}`} className="text-primary hover:underline">
                                        {payment.studentName}
                                    </Link>
                                </td>
                                <td className="py-3 px-4 border-b table-cell">{payment.itemName}</td>
                                <td className="py-3 px-4 border-b flex items-center gap-2 table-cell">
                                    <span>{formatAcademyCurrency(payment.amount, academy)}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPaidTab ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{isPaidTab ? 'Paid' : 'Unpaid'}</span>
                                </td>
                                <td className="py-3 px-4 border-b table-cell">{formatDate(isPaidTab ? payment.paidAt : payment.dueDate)}</td>

                                {isPaidTab && (
                                    <td className="py-3 px-4 border-b table-cell">
                                        <span>{payment.paymentMethod}</span>
                                    </td>
                                )}
                                {isPaidTab && (
                                    <td className="py-3 px-4 border-b table-cell">
                                        {payment.receiptUrl ? (
                                            <a
                                                href={payment.receiptUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center text-primary hover:text-primary-hover"
                                                aria-label="View receipt"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                )}
                                {!isPaidTab && (
                                    <td className="py-3 px-4 border-b table-cell">
                <button
                    onClick={() => onPay && onPay(index)}
                    className="btn-primary-sm"
                    aria-label={`Add payment for ${payment.studentName}`}
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
            <div className="grid gap-3 md:hidden">
                {payments.map((payment, index) => (
                    <div key={index} className="bg-section border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-gray-500">{academy?.studentLabelSingular || 'Student'}</p>
                                <Link to={`/students/${payment.studentId}`} className="font-semibold text-gray-900 hover:underline">
                                    {payment.studentName}
                                </Link>
                                <p className="text-sm text-gray-600 mt-1">{payment.itemName}</p>
                            </div>
                            {!isPaidTab && (
                                <button
                                    onClick={() => onPay && onPay(index)}
                            className="btn-primary-sm"
                            aria-label={`Add payment for ${payment.studentName}`}
                        >
                            <Plus className="mr-1 h-4 w-4" /> Pay
                        </button>
                            )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div className="bg-gray-50 rounded-md p-2">
                                <p className="text-xs text-gray-500">Amount</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{formatAcademyCurrency(payment.amount, academy)}</p>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPaidTab ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{isPaidTab ? 'Paid' : 'Unpaid'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2">
                                <p className="text-xs text-gray-500">{isPaidTab ? 'Paid Date' : 'Due Date'}</p>
                                <p className="font-medium">{formatDate(isPaidTab ? payment.paidAt : payment.dueDate)}</p>
                            </div>
                            {isPaidTab && (
                                <div className="bg-gray-50 rounded-md p-2 col-span-2">
                                    <p className="text-xs text-gray-500">Method</p>
                                    <p className="font-medium">{payment.paymentMethod}</p>
                                    {payment.receiptUrl && (
                                        <a
                                            href={payment.receiptUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline text-xs mt-1 inline-block"
                                        >
                                            View receipt
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

        const PaymentModal = ({ payment, onClose }) => {
        const [paymentMethod, setPaymentMethod] = useState('Cash');
        const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
        const [receiptFile, setReceiptFile] = useState(null);
        const [receiptError, setReceiptError] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleReceiptChange = (e) => {
            const file = e.target.files?.[0];
            if (!file) {
                setReceiptFile(null);
                setReceiptError('');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                setReceiptError('Receipt must be an image or PDF.');
                e.target.value = '';
                return;
            }

            if (file.size > maxSize) {
                setReceiptError('Receipt must be smaller than 5MB.');
                e.target.value = '';
                return;
            }

            setReceiptError('');
            setReceiptFile(file);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                if (receiptError) {
                    toast.error(receiptError);
                    return;
                }
                const picked = new Date(paymentDate);
                const today = new Date();
                picked.setHours(0,0,0,0);
                today.setHours(0,0,0,0);
                if (picked > today) {
                    toast.error('Payment date cannot be in the future.');
                    return;
                }
                setIsSubmitting(true);
                const playerRef = doc(db, `academies/${academyId}/players`, payment.studentId);
                const playerDoc = await getDoc(playerRef);
                if (!playerDoc.exists()) {
                    toast.error(`${academy?.studentLabelSingular || 'Student'} not found.`);
                    return;
                }

                const playerData = playerDoc.data();
                let receiptData = null;
                if (receiptFile) {
                    try {
                        receiptData = await uploadReceiptFile(receiptFile, payment.studentId);
                    } catch (error) {
                        console.error('Error uploading receipt:', error);
                        toast.error(error.message || 'Failed to upload receipt.');
                        return;
                    }
                }
                const updatedPayments = playerData.oneTimeProducts.map((p, idx) => {
                    if (idx === payment.originalIndex) {
                        return {
                            ...p,
                            status: 'paid',
                            paidAt: new Date(paymentDate),
                            paymentMethod: paymentMethod,
                            ...(receiptData || {}),
                        };
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
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-section md:bg-black md:bg-opacity-50 overflow-y-auto">
                <div className="relative w-full h-full md:h-auto bg-section p-6 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl max-w-sm md:max-w-sm">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold">Register Payment</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-md hover:bg-gray-100"
                            aria-label="Close"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <p className="mb-1"><strong>Item:</strong> {payment.itemName}</p>
                    <p className="mb-4"><strong>Amount:</strong> {formatAcademyCurrency(payment.amount, academy)}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label><select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"><option>Cash</option><option>Credit Card</option><option>Bank Transfer</option><option>Other</option></select></div>
                        <div><label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label><input type="date" id="paymentDate" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
                        <div>
                            <label htmlFor="receiptFile" className="block text-sm font-medium text-gray-700">Receipt (optional)</label>
                            <input
                                type="file"
                                id="receiptFile"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={handleReceiptChange}
                                className="mt-1 block w-full text-sm text-gray-700"
                            />
                            {receiptFile && (
                                <p className="text-xs text-gray-500 mt-1">{receiptFile.name}</p>
                            )}
                            {receiptError && (
                                <p className="text-xs text-red-600 mt-1">{receiptError}</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
                            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary w-full md:w-auto">{isSubmitting ? 'Saving...' : 'Confirm Payment'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const handleTabTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchMoved.current = false;
    };

    const handleTabTouchMove = (e) => {
        if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) {
            touchMoved.current = true;
        }
    };

    const handleTabClick = (action) => () => {
        if (touchMoved.current) {
            touchMoved.current = false;
            return;
        }
        action();
    };

  return (
    <div className="section-container">
      <div className="section-content-wrapper space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Payments</h2>
          <div />
        </div>
      <div className="content-card-responsive">
      <LoadingBar loading={loading} />

            <div className="tabs-container">
                <div
                    className="tabs-scroll-wrapper"
                    onTouchStart={handleTabTouchStart}
                    onTouchMove={handleTabTouchMove}
                >
                    <nav
                        className="tabs-nav"
                        aria-label="Tabs"
                        role="tablist"
                    >
                        <button role="tab" aria-selected={activeTab === 'unpaid'} onClick={handleTabClick(() => setActiveTab('unpaid'))} className={`tab-button ${activeTab === 'unpaid' ? 'active' : ''}`}>
                        <Clock /> Unpaid
                    </button>
                        <button role="tab" aria-selected={activeTab === 'paid'} onClick={handleTabClick(() => setActiveTab('paid'))} className={`tab-button ${activeTab === 'paid' ? 'active' : ''}`}>
                        <CheckCircle /> Paid
                    </button>
                    </nav>
                    <div className="tabs-scroll-gradient md:hidden" aria-hidden />
                </div>
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
      </div>
    </div>
    );
}
