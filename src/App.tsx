import React, { useState, useEffect, useRef } from 'react';
import { parseTransactionHash } from './utils/parsers/transactionParser';
import type { FuelTransaction, ParsedField, Input, Output } from './types/transaction';
import './index.css';

// FieldSegment component with proper tooltip
const FieldSegment = ({ field }: { field: ParsedField }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const segmentRef = useRef<HTMLDivElement>(null);
  
  // Choose color based on field purpose
  const getColorClass = () => {
    const colors = [
      'bg-blue-200 text-blue-800',
      'bg-green-200 text-green-800',
      'bg-purple-200 text-purple-800',
      'bg-amber-200 text-amber-800',
      'bg-pink-200 text-pink-800',
      'bg-teal-200 text-teal-800',
    ];
    
    // Use consistent colors based on field name
    const nameHash = field.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    return colors[nameHash % colors.length];
  };

  return (
    <div 
      ref={segmentRef}
      className={`relative inline-block px-2 py-1 ${getColorClass()} cursor-help`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="text-xs font-mono">{field.hexValue}</div>
      
      {showTooltip && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mt-[-10px] z-50 w-48 px-3 py-2 rounded shadow-lg bg-neutral-800 text-white text-xs">
          <div className="font-medium">{field.name}</div>
          {field.value !== field.hexValue && <div className="text-xs mt-1 opacity-80">{field.value}</div>}
          <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-neutral-800"></div>
        </div>
      )}
    </div>
  );
};

// Updated Transaction breakdown with simpler approach
const TransactionBreakdown = ({ transaction }: { transaction: FuelTransaction }) => {
  if (!transaction) {
    return <div className="p-4 text-center text-neutral-content">No transaction data available</div>;
  }

  // Check if parsedFields exists and has values
  if (!('parsedFields' in transaction) || !transaction.parsedFields || transaction.parsedFields.length === 0) {
    // Fallback to displaying the raw transaction hash
    return (
      <div className="p-4">
        <div className="text-sm text-center text-neutral-content mb-2">
          Raw transaction data (no parsed fields available)
        </div>
        <div className="bg-neutral-soft p-3 rounded overflow-x-auto">
          <pre className="text-xs font-mono">
            {transaction.rawHex || JSON.stringify(transaction, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // Direct flat approach - just display fields in order by position
  const visibleFields = transaction.parsedFields
    .filter(field => !field.isGroupHeader)
    .sort((a, b) => a.startPos - b.startPos);

  console.log("Fields to display:", visibleFields);

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <div className="flex items-start space-x-0.5 border border-neutral-border rounded p-2">
          {visibleFields.length > 0 ? (
            visibleFields.map((field, index) => (
              <FieldSegment key={`field-${index}`} field={field} />
            ))
          ) : (
            <div className="p-4 text-center text-neutral-content w-full">
              No displayable fields found in transaction
            </div>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-gradient-to-r from-green-500 to-green-500 mt-2 rounded-full" style={{ width: '5%' }}></div>
    </div>
  );
};

// Input item component for transaction overview
const InputItem = ({ input }: { input: Input }) => (
  <div className="p-2 my-1 rounded border border-neutral-border">
    <div className="text-xs text-muted mb-1">Input Type: {getInputTypeName(input.type)}</div>
    <div className="text-sm font-mono overflow-hidden text-ellipsis">
      Type: {input.type}
    </div>
  </div>
);

// Helper function to get input type name
const getInputTypeName = (type: number): string => {
  const types = ['Coin', 'Contract', 'Message'];
  return types[type] || `Unknown (${type})`;
};

// Output item component for transaction overview
const OutputItem = ({ output }: { output: Output }) => {
  const getOutputTypeName = (type: number): string => {
    const types = ['Coin', 'Contract', 'Change', 'Variable'];
    return types[type] || `Unknown (${type})`;
  };

  return (
    <div className="p-2 my-1 rounded border border-neutral-border">
      <div className="text-xs text-muted mb-1">
        Output Type: {getOutputTypeName(output.type)}
      </div>
      
      {'to' in output && (
        <div className="text-sm font-mono mb-1 overflow-hidden text-ellipsis">
          To: {output.to}
        </div>
      )}
      
      {'amount' in output && (
        <div className="text-sm">Amount: {output.amount}</div>
      )}
    </div>
  );
};

// Transaction overview component with all data
const TransactionOverview = ({ transaction }: { transaction: FuelTransaction }) => {
  if (!transaction) return null;
  
  // Helper to get transaction type name
  const getTxTypeName = (type: number) => {
    const types = ['Script', 'Create', 'Mint', 'Upgrade'];
    return types[type] || `Unknown (${type})`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Basic transaction info */}
      <InfoCard label="Type" value={getTxTypeName(transaction.type)} />
      
      {/* Gas limit (for script transactions) */}
      {'scriptGasLimit' in transaction && (
        <InfoCard 
          label="Gas Limit" 
          value={parseInt(transaction.scriptGasLimit.toString(), 16).toString()} 
        />
      )}
      
      {/* Script size if available */}
      {'scriptLength' in transaction && (
        <InfoCard 
          label="Script Size" 
          value={`${transaction.scriptLength} bytes`} 
        />
      )}
      
      {/* Inputs section */}
      <div className="md:col-span-2 p-4 bg-neutral-soft rounded-lg">
        <div className="text-muted text-sm mb-2">Inputs ({transaction.inputsCount || 0})</div>
        
        {transaction.inputs && transaction.inputs.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {transaction.inputs.map((input, index) => (
              <InputItem key={`input-${index}`} input={input} />
            ))}
            
            {transaction.inputsCount && transaction.inputsCount > transaction.inputs.length && (
              <div className="text-center text-muted py-2 text-sm">
                + {transaction.inputsCount - transaction.inputs.length} more inputs...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted py-4">No inputs for this transaction</div>
        )}
      </div>
      
      {/* Outputs section */}
      <div className="md:col-span-2 p-4 bg-neutral-soft rounded-lg">
        <div className="text-muted text-sm mb-2">Outputs ({transaction.outputsCount || 0})</div>
        
        {transaction.outputs && transaction.outputs.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {transaction.outputs.map((output, index) => (
              <OutputItem key={`output-${index}`} output={output} />
            ))}
            
            {transaction.outputsCount && transaction.outputsCount > transaction.outputs.length && (
              <div className="text-center text-muted py-2 text-sm">
                + {transaction.outputsCount - transaction.outputs.length} more outputs...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted py-4">No outputs for this transaction</div>
        )}
      </div>
      
      {/* Witnesses section */}
      <div className="md:col-span-2 p-4 bg-neutral-soft rounded-lg">
        <div className="text-muted text-sm mb-2">Witnesses ({transaction.witnessesCount || 0})</div>
        
        {transaction.witnessesCount ? (
          <div className="text-sm">
            {transaction.witnessesCount} witness(es) in this transaction
          </div>
        ) : (
          <div className="text-center text-muted py-4">No witnesses for this transaction</div>
        )}
      </div>
    </div>
  );
};

// Simple info card component
const InfoCard = ({ label, value }: { label: string, value: string }) => (
  <div className="p-4 bg-neutral-soft rounded-lg">
    <div className="text-muted text-sm mb-1">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

// Main application component
function App() {
  const [hash, setHash] = useState('');
  const [transaction, setTransaction] = useState<FuelTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
  };

  // Process transaction hash
  const processHash = () => {
    if (!hash.trim()) return;
    
    try {
      const txData = parseTransactionHash(hash);
      
      if (!txData) {
        setError('Could not parse transaction hash');
        return;
      }
      
      if ('error' in txData) {
        setError(txData.error);
        return;
      }
      
      // Store raw hex for display fallback
      const txWithRaw = {
        ...txData,
        rawHex: hash.startsWith('0x') ? hash.substring(2) : hash
      };
      
      console.log('Parsed transaction data:', txWithRaw);
      setTransaction(txWithRaw);
      setError(null);
    } catch (err) {
      console.error('Error decoding transaction:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Check URL for hash parameter on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParam = params.get('hash');
    
    // If hash is in URL, use it
    if (hashParam) {
      setHash(hashParam);
      try {
        const txData = parseTransactionHash(hashParam);
        if (txData && !('error' in txData)) {
          setTransaction(txData);
        }
      } catch (err) {
        console.error('Error processing initial hash:', err);
      }
    } 
    // Otherwise use a default example hash
    else {
      // Default example hash - you can replace this with any valid transaction hash
      const defaultHash = '0x0000000000000000000000000001ab4623e6eb1aaf47d04e65397c335f3425c3f3fdb31fe00319dcf31096d642ac8e730000000000000018000000000000008d0000000000000008000000000000000500000000000000050000000000000001724028c0724428985d451000724828a02d41148a2404000000000000000000000000000000000000000000000000000000000000000000000000000000000000564b3d180ddf5cfe32b5478a2f0ec8661491280c4211366182b9cf41eaf26a2c00000000000028f0000000000000290d0000000000000015666f72776172645f726577617264735f72616e676500000010e3db0b2300000000001ed8ce00000000001ed8cf000000000000000000044300000000000000017f34cb7c777ecc3ea68538bd9ac435860a0eadec7097bcdfe547143d71f05eeb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011d7b730000000000000000564b3d180ddf5cfe32b5478a2f0ec8661491280c4211366182b9cf41eaf26a2c00000000000000017f34cb7c777ecc3ea68538bd9ac435860a0eadec7097bcdfe547143d71f05eeb00000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011d7b7300000000000000003927650331af3b57489e2390d981bda68b96a6fd6179e7e6eb8ebe37dd005ef600000000000000017f34cb7c777ecc3ea68538bd9ac435860a0eadec7097bcdfe547143d71f05eeb00000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011d7b730000000000000000095faac82412324c60fdf6934405b5df9de49982284779536218d16d5ee3dc4c00000000000000017f34cb7c777ecc3ea68538bd9ac435860a0eadec7097bcdfe547143d71f05eeb00000000000000030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011d7b7300000000000000001d8b1538a7ecf81354d52520bdb675dbfbc78e66111629a1e529662683ebf25600000000000000009c2332452132c6b59d9dd62915f769a194004b8bd940977f603c56cd2d66fdfc0000000000000004bad62d52565e147cf88d6291d37f4237f52fcd092bcab7a9758ea7c9065761f7000000001b84b786f8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad0700000000011d7b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bad62d52565e147cf88d6291d37f4237f52fcd092bcab7a9758ea7c9065761f7000000001b84b630f8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad0700000000000000405650fbc2090ea6278b5ea09c38e2117c783b43bbd9d9e9797033f4abb0db214661523bd5b64c40f505ea0596df00e6e9da8946d1716f7d4c091db79909e9eb70';
      setHash(defaultHash);
      try {
        const txData = parseTransactionHash(defaultHash);
        if (txData && !('error' in txData)) {
          setTransaction(txData);
        }
      } catch (err) {
        console.error('Error processing default hash:', err);
      }
    }
    
    // Set initial theme
    document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
  }, []);

  return (
    <div className="min-h-screen">
      <header className="p-4 border-b border-neutral-border">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Fuel Transaction Hash Debugger</h1>
          <button onClick={toggleTheme} className="p-2 rounded bg-neutral-soft" type="button">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Enter transaction hash (with or without 0x prefix)"
              className="flex-grow p-2 border border-neutral-border rounded text-neutral-content bg-neutral-soft"
              onKeyDown={(e) => e.key === 'Enter' && processHash()}
            />
            <button
              onClick={processHash}
              className="px-4 py-2 bg-accent text-accent-content rounded"
              type="button"
            >
              Decode
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-4 mb-6 bg-error/20 text-error border border-error rounded">
            {error}
          </div>
        )}
        
        {transaction && (
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">Transaction Hash Breakdown</h2>
              <div className="border border-neutral-border rounded overflow-x-auto">
                <TransactionBreakdown transaction={transaction} />
              </div>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">Transaction Overview</h2>
              <TransactionOverview transaction={transaction} />
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">Raw JSON</h2>
              <div className="border border-neutral-border rounded p-4 bg-neutral-soft">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(transaction, null, 2)}
                </pre>
              </div>
            </section>
          </div>
        )}
      </main>
      
      <footer className="container mx-auto p-4 text-center text-muted text-sm mt-8">
        Fuel Transaction Hash Debugger - A tool for decoding and exploring Fuel transactions
      </footer>
    </div>
  );
}

export default App;
