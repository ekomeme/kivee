import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function PlayerDetail({ player, onMarkAsPaid, onRemoveProduct, academy }) {

  const getBillingCycleLabel = (pricingModel) => {
    const labels = {
      'monthly': 'Monthly',
      'semi-annual': 'Semi-Annual',
      'annual': 'Annual',
      'term': 'Term',
    };
    return labels[pricingModel] || 'N/A';
  };

  const PaymentModal = ({ product, productIndex, onClose }) => {
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    const handleSubmit = (e) => {
      e.preventDefault();
      onMarkAsPaid(productIndex, paymentMethod);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
          <h3 className="text-xl font-bold mb-4">Register Payment</h3>
          <p className="mb-1"><strong>Product:</strong> {product.productDetails.name}</p>
          <p className="mb-4"><strong>Amount:</strong> {new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(product.productDetails.price)}</p>
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
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md">Cancel</button>
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-md">Confirm Payment</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const [showPaymentModalFor, setShowPaymentModalFor] = useState(null); // Holds the index of the product

  const formatValue = (value) => value || 'N/A';

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Player Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Student Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="flex items-center">
              {player.photoURL ? (
                <img src={player.photoURL} alt="Student photo" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">No photo</div>
              )}
            </div>
            <div></div>
            <div><strong>Name:</strong> <span className="text-gray-800">{formatValue(`${player.name} ${player.lastName}`)}</span></div>
            <div><strong>Date of Birth:</strong> <span className="text-gray-800">{formatValue(player.birthday)}</span></div>
            <div><strong>Gender:</strong> <span className="text-gray-800">{formatValue(player.gender)}</span></div>
            <div><strong>Group:</strong> <span className="text-gray-800">{formatValue(player.groupName)}</span></div>
            <div><strong>Email:</strong> <span className="text-gray-800">{formatValue(player.email)}</span></div>
            <div><strong>Phone:</strong> <span className="text-gray-800">{formatValue(player.contactPhone)}</span></div>
          </div>
        </fieldset>

        {/* Tutor Section */}
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

        {/* Payment Info Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">Plan Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {player.plan ? (
              <>
                <div><strong>Plan:</strong> <span className="text-gray-800">{formatValue(player.planDetails?.name)} ({player.plan.type})</span></div>
                <div><strong>Billing cycle:</strong> <span className="text-gray-800">{getBillingCycleLabel(player.plan.paymentCycle)}</span></div>
                <div><strong>Start Date:</strong> <span className="text-gray-800">{formatValue(player.plan.startDate)}</span></div>
              </>
            ) : (
              <p className="text-gray-600 md:col-span-2">No plan assigned.</p>
            )}
            <div className="md:col-span-2"><strong>Notes:</strong> <p className="text-gray-800 whitespace-pre-wrap">{formatValue(player.notes)}</p></div>
          </div>
        </fieldset>

        {/* One-time Products Section */}
        <fieldset className="border-t-2 border-gray-200 pt-6">
          <legend className="text-xl font-semibold text-gray-900 px-2">One-time Products</legend>
          {player.oneTimeProducts && player.oneTimeProducts.length > 0 ? (
            <div className="space-y-3 mt-4">
              {player.oneTimeProducts.map((p, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                  <div>
                    <p className="font-medium">{p.productDetails?.name || 'Product not found'}</p>
                    <p className="text-sm text-gray-600">{new Intl.NumberFormat(undefined, { style: 'currency', currency: academy.currency || 'USD' }).format(p.productDetails?.price || 0)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {p.status}
                    </span>
                    {p.status !== 'paid' && (
                      <>
                        <button onClick={() => setShowPaymentModalFor(index)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-md flex items-center">
                          <Plus className="mr-1 h-4 w-4" /> Add Payment
                        </button>
                        <button onClick={() => onRemoveProduct(index)} className="p-1 text-gray-400 hover:text-red-600" title="Remove Product">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {p.status === 'paid' && p.paidAt && (
                      <p className="text-xs text-gray-500">Paid on {new Date(p.paidAt.seconds * 1000).toLocaleDateString()} via {p.paymentMethod}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-600">No one-time products assigned.</p>
          )}
        </fieldset>
      </div>
      {showPaymentModalFor !== null && <PaymentModal product={player.oneTimeProducts[showPaymentModalFor]} productIndex={showPaymentModalFor} onClose={() => setShowPaymentModalFor(null)} />}
    </div>
  );
}