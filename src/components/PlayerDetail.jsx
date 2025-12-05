import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlayerDetail({ player, onMarkAsPaid, onRemoveProduct, academy, activeTab: controlledTab, onTabChange, paymentPage, onPaymentPageChange }) {
  const [activeTab, setActiveTab] = useState(controlledTab || 'details');
  const studentLabelSingular = academy?.studentLabelSingular || 'Student';
  const studentLabelPlural = academy?.studentLabelPlural || 'Students';

  useEffect(() => {
    if (controlledTab) setActiveTab(controlledTab);
  }, [controlledTab]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const toDate = (d) => (d?.seconds ? new Date(d.seconds * 1000) : new Date(d));

  const [showPaymentModalFor, setShowPaymentModalFor] = useState(null); // Holds the original index of the payment

  const allPaymentsWithOriginalIndex = player.oneTimeProducts?.map((p, index) => ({ ...p, originalIndex: index })) || [];
  const subscriptionPayments = allPaymentsWithOriginalIndex
    .filter(p => p.paymentFor === 'tier')
    .sort((a, b) => toDate(b.dueDate) - toDate(a.dueDate)); // Most recent first
  const productPayments = allPaymentsWithOriginalIndex.filter(p => !p.paymentFor || p.paymentFor !== 'tier');

  const earliestSubscription = subscriptionPayments.length
    ? [...subscriptionPayments].sort((a, b) => toDate(a.dueDate) - toDate(b.dueDate))[0]
    : null;

  const combinedPayments = [...subscriptionPayments, ...productPayments].sort((a, b) => {
    const da = a.dueDate || a.paidAt || (a.productDetails ? new Date() : null);
    const db = b.dueDate || b.paidAt || (b.productDetails ? new Date() : null);
    return toDate(db) - toDate(da);
  });

  const [currentPage, setCurrentPage] = useState(paymentPage || 1);
  useEffect(() => {
    if (paymentPage) setCurrentPage(paymentPage);
  }, [paymentPage]);

  const setPage = (next) => {
    setCurrentPage(next);
    onPaymentPageChange?.(next);
  };
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(combinedPayments.length / pageSize));
  const paginatedPayments = combinedPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const PaymentModal = ({ product, productIndex, onClose }) => {
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubscription = product.paymentFor === 'tier';
    const name = isSubscription ? product.itemName : product.productDetails?.name;
    const amount = isSubscription ? product.amount : product.productDetails?.price;
    const handleSubmit = (e) => {
      e.preventDefault();
      const picked = new Date(paymentDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      picked.setHours(0,0,0,0);
      if (picked > today) {
        toast.error('Payment date cannot be in the future.');
        return;
      }
      setIsSubmitting(true);
      onMarkAsPaid(productIndex, paymentMethod, paymentDate);
      setIsSubmitting(false);
      onClose();
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
          <p className="mb-1"><strong>Item:</strong> {name || 'N/A'}</p>
          <p className="mb-4"><strong>Amount:</strong> {new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(amount || 0)}</p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                  <option>Cash</option>
                  <option>Credit Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3 md:static sticky bottom-0 left-0 right-0 bg-section py-3 md:bg-transparent md:py-0">
              <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md w-full md:w-auto">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md w-full md:w-auto disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Confirm Payment'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const formatValue = (value) => value || 'N/A';

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const addCycleToDate = (date, pricingModel) => {
    const base = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
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
        break;
    }
    return result;
  };

  const getExpiryInfo = (payment) => {
    if (!payment?.dueDate) return { label: 'No due date', isSoon: false };

    const pricingModel = payment.tierDetails?.pricingModel;
    let expiryDate;

    if (pricingModel === 'term' && payment.tierDetails?.termEndDate) {
      expiryDate = payment.tierDetails.termEndDate;
    } else if (pricingModel) {
      expiryDate = addCycleToDate(payment.dueDate, pricingModel);
    } else {
      expiryDate = payment.dueDate;
    }

    const now = new Date();
    const target = expiryDate instanceof Date ? expiryDate : (expiryDate?.seconds ? new Date(expiryDate.seconds * 1000) : new Date(expiryDate));
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    let status = 'ok';
    if (diffDays < 0) {
      status = 'expired';
    } else if (diffDays <= 10) {
      status = 'soon';
    }

    return {
      label: formatDate(target),
      status,
    };
  };

  return (
    <div className="bg-section p-4 md:p-8 rounded-none shadow-none md:rounded-lg md:shadow-xl w-full max-w-7xl mx-auto">
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => changeTab('details')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Details
          </button>
          <button onClick={() => changeTab('finances')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'finances' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            Finances
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-8">
          <fieldset className="border-t-2 border-gray-200 pt-6">
            <legend className="text-xl font-semibold text-gray-900 px-2">{studentLabelSingular} Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex items-center">
                {player.photoURL ? (
                  <img src={player.photoURL} alt={`${studentLabelSingular} photo`} className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">No photo</div>
                )}
              </div>
              <div></div>
              <div><strong>Name:</strong> <span className="text-gray-800">{formatValue(`${player.name} ${player.lastName}`)}</span></div>
              <div><strong>ID:</strong> <span className="text-gray-800">{formatValue(player.studentId)}</span></div>
              <div><strong>Date of Birth:</strong> <span className="text-gray-800">{formatValue(player.birthday)}</span></div>
              <div><strong>Gender:</strong> <span className="text-gray-800">{formatValue(player.gender)}</span></div>
              <div><strong>Group:</strong> <span className="text-gray-800">{formatValue(player.groupName)}</span></div>
              <div><strong>Email:</strong> <span className="text-gray-800">{formatValue(player.email)}</span></div>
              <div><strong>Phone:</strong> <span className="text-gray-800">{formatValue(player.contactPhone)}</span></div>
            </div>
          </fieldset>

          <fieldset className="border-t-2 border-gray-200 pt-6">
            <legend className="text-xl font-semibold text-gray-900 px-2">Tutor / Guardian</legend>
            {player.tutor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div><strong>Tutor Name:</strong> <span className="text-gray-800">{formatValue(`${player.tutor.name} ${player.tutor.lastName}`)}</span></div>
                <div><strong>Tutor Email:</strong> <span className="text-gray-800">{formatValue(player.tutor.email)}</span></div>
                <div><strong>Tutor Phone:</strong> <span className="text-gray-800">{formatValue(player.tutor.contactPhone)}</span></div>
              </div>
            ) : (
              <p className="mt-4 text-gray-600">No tutor/guardian assigned.</p>
            )}
          </fieldset>

          <fieldset className="border-t-2 border-gray-200 pt-6">
            <legend className="text-xl font-semibold text-gray-900 px-2">Subscription</legend>
            {player.plan ? (
              <div className="p-3 bg-gray-50 rounded-md border mt-4">
                <p className="text-sm font-medium text-gray-700">Assigned Plan</p>
                <p className="text-lg font-semibold text-gray-900">{player.planDetails?.name || 'Plan not found'}</p>
                <p className="text-sm text-gray-700 mt-1">
                  Start date:{' '}
                  <span className="font-semibold">
                    {earliestSubscription ? formatDate(earliestSubscription.dueDate) : 'N/A'}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-gray-600">No subscription assigned.</p>
            )}
          </fieldset>

          <fieldset className="border-t-2 border-gray-200 pt-6">
            <legend className="text-xl font-semibold text-gray-900 px-2">One-time Products</legend>
            {productPayments.length > 0 ? (
              <div className="space-y-3 mt-4">
                {productPayments.map((p) => (
                  <div key={`prod-detail-${p.originalIndex}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                    <div>
                      <p className="font-medium">{p.productDetails?.name || 'Product not found'}</p>
                      <p className="text-sm text-gray-600">{new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(p.productDetails?.price || 0)}</p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-gray-600">No one-time products assigned.</p>
            )}
          </fieldset>
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="space-y-4">
          {paginatedPayments.length > 0 ? (
            paginatedPayments.map((p, idx) => {
              const isSubscription = p.paymentFor === 'tier';
              const expiryInfo = isSubscription ? getExpiryInfo(p) : null;
              const showExpiredBadge = expiryInfo?.status === 'expired' && p.status !== 'paid';
              const expiryClass =
                showExpiredBadge
                  ? 'text-red-600 font-semibold'
                  : expiryInfo?.status === 'soon'
                    ? 'text-amber-600 font-semibold'
                    : '';
              const expiryLabel = (() => {
                if (expiryInfo?.status === 'expired') return `Expired on ${expiryInfo.label}`;
                if (expiryInfo?.status === 'soon') return `Expires soon on ${expiryInfo.label}`;
                return `Expires on ${expiryInfo?.label || 'N/A'}`;
              })();
              return (
                <div key={`pay-${p.originalIndex}-${idx}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                  <div>
                    <p className="font-medium">{isSubscription ? (p.itemName || 'Subscription Item') : (p.productDetails?.name || 'Product not found')}</p>
                    <p className="text-sm text-gray-600">{new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(isSubscription ? p.amount || 0 : p.productDetails?.price || 0)}</p>
                    {isSubscription && (
                      <p className="text-sm text-gray-600">
                        <span className={expiryClass}>{expiryLabel}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {p.status}
                    </span>
                    {p.status !== 'paid' && (
                      <button onClick={() => setShowPaymentModalFor(p.originalIndex)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-md flex items-center">
                        <Plus className="mr-1 h-4 w-4" /> Add Payment
                      </button>
                    )}
                    {!isSubscription && p.status !== 'paid' && (
                      <button onClick={() => onRemoveProduct(p.originalIndex)} className="p-1 text-gray-400 hover:text-red-600" title="Remove Item">
                        <Trash2 size={16} />
                      </button>
                    )}
                    {p.status === 'paid' && p.paidAt && (
                      <p className="text-xs text-gray-500">Paid on {new Date(p.paidAt.seconds * 1000).toLocaleDateString()} via {p.paymentMethod}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-600">No payments to display.</p>
          )}

          {combinedPayments.length > pageSize && (
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-gray-700">Page {currentPage} of {totalPages}</p>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {showPaymentModalFor !== null && <PaymentModal product={player.oneTimeProducts[showPaymentModalFor]} productIndex={showPaymentModalFor} onClose={() => setShowPaymentModalFor(null)} />}
    </div>
  );
}
