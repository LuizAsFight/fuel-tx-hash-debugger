import type { FuelTransaction } from '@/types/transaction';

interface TransactionHeaderProps {
  transaction: FuelTransaction;
}

export function TransactionHeader({ transaction }: TransactionHeaderProps) {
  const renderTransactionType = () => {
    switch (transaction.type) {
      case 0:
        return 'Script';
      case 1:
        return 'Create';
      case 2:
        return 'Mint';
      case 3:
        return 'Upgrade';
      case 4:
        return 'Upload';
      case 5:
        return 'Blob';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-3">Transaction Overview</h2>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
            <p className="font-medium">{renderTransactionType()}</p>
          </div>

          {'scriptGasLimit' in transaction && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gas Limit
              </p>
              <p className="font-medium">
                {Number.parseInt(
                  transaction.scriptGasLimit,
                  16,
                ).toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inputs</p>
            <p className="font-medium">{transaction.inputsCount}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Outputs</p>
            <p className="font-medium">{transaction.outputsCount}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Witnesses
            </p>
            <p className="font-medium">{transaction.witnessesCount}</p>
          </div>

          {'scriptLength' in transaction && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Script Size
              </p>
              <p className="font-medium">
                {transaction.scriptLength} instructions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
