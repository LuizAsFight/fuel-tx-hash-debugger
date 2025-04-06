import { useState } from 'react';
import { HashVisualizer } from '@/components/HashVisualizer/HashVisualizer';
import { TransactionHeader } from '@/components/TransactionHeader/TransactionHeader';
import { parseTransactionHash } from '@/utils/parsers/transactionParser';
import type { FuelTransaction } from '@/types/transaction';

export function TransactionViewer() {
  const [transactionHash, setTransactionHash] = useState('');
  const [transaction, setTransaction] = useState<FuelTransaction | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parseTransactionHash(transactionHash);
      setTransaction(parsed);
      setError(parsed ? '' : 'Unable to parse transaction hash');
    } catch (err) {
      setError(
        'Error parsing transaction: ' +
          (err instanceof Error ? err.message : 'Unknown error'),
      );
      setTransaction(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        Fuel Transaction Hash Debugger
      </h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            placeholder="Enter transaction hash (0x...)"
            className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Decode
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>

      {transaction && (
        <div className="space-y-6">
          <HashVisualizer
            hash={transactionHash}
            transactionType={transaction.type}
          />
          <TransactionHeader transaction={transaction} />

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Raw JSON</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(transaction, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
