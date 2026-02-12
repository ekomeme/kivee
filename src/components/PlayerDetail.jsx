import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Copy, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { toDateSafe } from '../utils/formatters';

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

  const [showPaymentModalFor, setShowPaymentModalFor] = useState(null); // Holds the original index of the payment

  const allPaymentsWithOriginalIndex = player.oneTimeProducts?.map((p, index) => ({ ...p, originalIndex: index })) || [];
  const subscriptionPayments = allPaymentsWithOriginalIndex
    .filter(p => p.paymentFor === 'tier')
    .sort((a, b) => toDateSafe(b.dueDate) - toDateSafe(a.dueDate)); // Most recent first
  const productPayments = allPaymentsWithOriginalIndex.filter(p => !p.paymentFor || p.paymentFor !== 'tier');

  const earliestSubscription = subscriptionPayments.length
    ? [...subscriptionPayments].sort((a, b) => toDateSafe(a.dueDate) - toDateSafe(b.dueDate))[0]
    : null;

  const combinedPayments = [...subscriptionPayments, ...productPayments].sort((a, b) => {
    const da = a.dueDate || a.paidAt || (a.productDetails ? new Date() : null);
    const db = b.dueDate || b.paidAt || (b.productDetails ? new Date() : null);
    return toDateSafe(db) - toDateSafe(da);
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
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptError, setReceiptError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSubscription = product.paymentFor === 'tier';
    const name = isSubscription ? product.itemName : (product.productName || product.productDetails?.name);
    const amount = isSubscription ? product.amount : (product.amount || product.productDetails?.price || 0);

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

    const handleSubmit = (e) => {
      e.preventDefault();
      if (receiptError) {
        toast.error(receiptError);
        return;
      }
      const picked = new Date(paymentDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      picked.setHours(0,0,0,0);
      if (picked > today) {
        toast.error('Payment date cannot be in the future.');
        return;
      }
      setIsSubmitting(true);
      onMarkAsPaid(productIndex, paymentMethod, paymentDate, receiptFile);
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

  const formatValue = (value) => value || 'N/A';

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = toDateSafe(date);
    if (!dateObj) return 'N/A';
    return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const calculateAge = (birthday) => {
    if (!birthday) return 'N/A';
    const birthDate = toDateSafe(birthday);
    if (!birthDate) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const addCycleToDate = (date, pricingModel) => {
    const base = toDateSafe(date);
    if (!base) return new Date();
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
    const target = toDateSafe(expiryDate) || new Date();
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
    <div className="bg-section w-full max-w-7xl mx-auto">
      <div className="sticky top-0 bg-section z-10">
        <div className="tabs-container px-6">
          <div className="tabs-scroll-wrapper">
            <nav className="tabs-nav" aria-label="Tabs">
              <button
                onClick={() => changeTab('details')}
                className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
              >
                Basic Information
              </button>
              <button
                onClick={() => changeTab('tutor')}
                className={`tab-button ${activeTab === 'tutor' ? 'active' : ''}`}
              >
                Tutor
              </button>
              <button
                onClick={() => changeTab('payments')}
                className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
              >
                Payments
              </button>
            </nav>
          </div>
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="card-info md:col-span-2 h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Nationality</p>
              <p className="text-base font-medium text-gray-900">{formatValue(player.nationality)}</p>
            </div>
            <div className="card-info h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Age</p>
              <p className="text-base font-medium text-gray-900">{calculateAge(player.birthday)}</p>
            </div>
            <div className="card-info h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="text-base font-medium text-gray-900">{formatValue(player.gender)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="card-info h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Birthday</p>
              <p className="text-base font-medium text-gray-900">{formatDate(player.birthday)}</p>
            </div>
            <div className="card-info h-[72px]">
              <p className="text-sm text-gray-500 mb-1">{player.documentType || 'ID'}</p>
              <p className="text-base font-medium text-gray-900">{formatValue(player.documentNumber || player.studentId)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="card-info relative h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Phone number</p>
              <p className="text-base font-medium text-gray-900">{formatValue(player.contactPhone)}</p>
              {player.contactPhone && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(player.contactPhone);
                    toast.success('Phone copied to clipboard!');
                  }}
                  className="absolute bottom-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="card-info relative h-[72px]">
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="text-base font-medium text-gray-900">{formatValue(player.email)}</p>
              {player.email && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(player.email);
                    toast.success('Email copied to clipboard!');
                  }}
                  className="absolute bottom-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontSize: '1.125rem', marginTop: '32px', marginBottom: '32px' }}>Assigned Plan</h3>
            {player.plan ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-primary rounded-lg p-4 text-white h-[72px]">
                  <div className="flex items-center justify-between h-full">
                    <p className="text-xl font-bold">{player.planDetails?.name || 'Plan not found'}</p>
                    <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">Active</span>
                  </div>
                </div>
                <div className="card-info h-[72px]">
                  <p className="text-sm text-gray-500 mb-1">Since</p>
                  <p className="text-base font-medium text-gray-900">{earliestSubscription ? formatDate(earliestSubscription.dueDate) : 'N/A'}</p>
                </div>
                <div className="card-info h-[72px]">
                  <p className="text-sm text-gray-500 mb-1">Paid amount</p>
                  <p className="text-base font-medium text-gray-900">$ 20,000.00</p>
                </div>
                <div className="card-info h-[72px]">
                  <p className="text-sm text-gray-500 mb-1">Next renewal</p>
                  <p className="text-base font-medium text-gray-900">March 24, 2026</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No subscription assigned.</p>
            )}
          </div>

        </div>
      )}

      {activeTab === 'tutor' && (
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Tutor / Guardian</h3>
          {player.tutor ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="card-info h-[72px]">
                <p className="text-sm text-gray-500 mb-1">Tutor Name</p>
                <p className="text-base font-medium text-gray-900">{formatValue(`${player.tutor.name} ${player.tutor.lastName}`)}</p>
              </div>
              <div className="card-info relative h-[72px]">
                <p className="text-sm text-gray-500 mb-1">Tutor Email</p>
                <p className="text-base font-medium text-gray-900">{formatValue(player.tutor.email)}</p>
                {player.tutor.email && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(player.tutor.email);
                      toast.success('Email copied to clipboard!');
                    }}
                    className="absolute bottom-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="card-info relative h-[72px]">
                <p className="text-sm text-gray-500 mb-1">Tutor Phone</p>
                <p className="text-base font-medium text-gray-900">{formatValue(player.tutor.contactPhone)}</p>
                {player.tutor.contactPhone && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(player.tutor.contactPhone);
                      toast.success('Phone copied to clipboard!');
                    }}
                    className="absolute bottom-4 right-4 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No tutor/guardian assigned.</p>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="p-6 space-y-4">
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
                    <p className="font-medium">{isSubscription ? (p.itemName || 'Subscription Item') : (p.productName || p.productDetails?.name || 'Product not found')}</p>
                    <p className="text-sm text-gray-600">{new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(isSubscription ? (p.amount || 0) : (p.amount || p.productDetails?.price || 0))}</p>
                    {isSubscription && (
                      <p className="text-sm text-gray-600">
                        <span className={expiryClass}>{expiryLabel}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
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
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <p>Paid on {toDateSafe(p.paidAt)?.toLocaleDateString() || 'N/A'} via {p.paymentMethod}</p>
                        {p.receiptUrl && (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            View receipt
                          </a>
                        )}
                      </div>
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
