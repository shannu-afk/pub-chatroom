import React from "react";

function CallPopup({ caller, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4">{caller} is calling you...</h2>
        <div className="flex gap-4">
          <button
            onClick={onAccept}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default CallPopup;