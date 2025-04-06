import { useState, useEffect } from 'react';
import { TransactionType } from '@/types/transaction';

interface HashSegment {
  value: string;
  label: string;
  description: string;
  color: string;
}

interface HashVisualizerProps {
  hash: string;
  transactionType?: TransactionType;
}

export function HashVisualizer({ hash, transactionType }: HashVisualizerProps) {
  const [segments, setSegments] = useState<HashSegment[]>([]);

  useEffect(() => {
    if (!hash) {
      setSegments([]);
      return;
    }

    // Remove 0x prefix if present
    const hexString = hash.startsWith('0x') ? hash.substring(2) : hash;

    // Define segments based on transaction type
    let newSegments: HashSegment[] = [];

    if (transactionType === TransactionType.Script) {
      newSegments = [
        {
          value: hexString.substring(0, 2),
          label: 'Type',
          description: 'Script Transaction (0)',
          color: 'bg-blue-200 dark:bg-blue-800',
        },
        {
          value: hexString.substring(2, 18),
          label: 'Gas Limit',
          description: 'Maximum gas allowed for this transaction',
          color: 'bg-green-200 dark:bg-green-800',
        },
        {
          value: hexString.substring(18, 82),
          label: 'Receipts Root',
          description: 'Merkle root of transaction receipts',
          color: 'bg-purple-200 dark:bg-purple-800',
        },
        // Add more segments as needed
      ];
    } else if (transactionType === TransactionType.Mint) {
      // Define segments for mint transaction
    } else {
      // Default segmentation if type not recognized
      newSegments = [
        {
          value: hexString,
          label: 'Unknown',
          description: 'Transaction format not recognized',
          color: 'bg-gray-200 dark:bg-gray-700',
        },
      ];
    }

    setSegments(newSegments);
  }, [hash, transactionType]);

  if (!hash) {
    return null;
  }

  return (
    <div className="my-4">
      <h3 className="text-lg font-medium mb-2">Transaction Hash Breakdown</h3>
      <div className="flex flex-wrap">
        {segments.map((segment, index) => (
          <div key={index} className="relative group cursor-help">
            <code
              className={`font-mono text-xs px-1 py-0.5 rounded ${segment.color}`}
            >
              {segment.value}
            </code>

            <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-white dark:bg-gray-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
              <p className="font-bold text-sm">{segment.label}</p>
              <p className="text-xs">{segment.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
