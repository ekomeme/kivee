import React from 'react';

export default function PlayerDetail({ player }) {

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
            <div><strong>Category:</strong> <span className="text-gray-800">{formatValue(player.category)}</span></div>
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
          <legend className="text-xl font-semibold text-gray-900 px-2">Payment Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div><strong>Assigned Plan:</strong> <span className="text-gray-800">{formatValue(player.tierName)}</span></div>
            <div><strong>Payment Type:</strong> <span className="text-gray-800">{formatValue(player.paymentType)}</span></div>
            <div><strong>Trial Period:</strong> <span className="text-gray-800">{player.isFreeTrial ? 'Yes' : 'No'}</span></div>
            {player.isFreeTrial && (
              <div><strong>End of trial period:</strong> <span className="text-gray-800">{formatValue(player.freeTrialEndDate)}</span></div>
            )}
            <div><strong>Start Date:</strong> <span className="text-gray-800">{formatValue(player.startDate)}</span></div>
            <div><strong>Payment Date:</strong> <span className="text-gray-800">{formatValue(player.paidDate)}</span></div>
            <div><strong>Expiration Date:</strong> <span className="text-gray-800">{formatValue(player.expiryDate)}</span></div>
            <div className="md:col-span-2"><strong>Receipt:</strong> <p className="text-gray-800 whitespace-pre-wrap">{formatValue(player.receipt)}</p></div>
            <div className="md:col-span-2"><strong>Notes:</strong> <p className="text-gray-800 whitespace-pre-wrap">{formatValue(player.notes)}</p></div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}