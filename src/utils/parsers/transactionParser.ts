import {
  TransactionType,
  PolicyType,
  InputType,
  OutputType,
  type FuelTransaction,
  type ScriptTransaction,
  type CreateTransaction,
  type MintTransaction,
  type UpgradeTransaction,
  type UploadTransaction,
  type BlobTransaction,
  type Input,
  type Output,
  type Witness,
  type Policy,
} from '@/types/transaction';

// Updated byte sizes based on the spec
const BYTE_SIZES = {
  INTEGER: 8, // All integers are right-aligned to 8 bytes (64 bits)
  BYTE32: 32,
  TYPE: 8, // Not 1 byte, but 8 bytes (64 bits)
  GAS_LIMIT: 8,
  RECEIPTS_ROOT: 32,
  SCRIPT_LENGTH: 8, // Not 2 bytes, but 8 bytes
  SCRIPT_DATA_LENGTH: 8, // Not 4 bytes, but 8 bytes
  INPUTS_COUNT: 8, // Not 2 bytes, but 8 bytes
  OUTPUTS_COUNT: 8, // Not 2 bytes, but 8 bytes
  WITNESSES_COUNT: 8, // Not 2 bytes, but 8 bytes
  POLICY_TYPES: 8 // Not 1 byte, but 8 bytes
};

// Update the ParsedField interface to support hierarchical grouping
export interface ParsedField {
  name: string;
  value: any;
  startPos: number;
  endPos: number;
  size: number;
  hexValue: string;
  groupId?: string;     // Identifier for grouping related fields
  level: number;        // Nesting level (0 for top level, 1 for first nested level, etc.)
  isGroupHeader?: boolean; // Is this a group header field
}

// Change from extending to intersection type
export type ParsedTransaction = FuelTransaction & {
  parsedFields: ParsedField[];
};

// Track positions during parsing
let fieldPosition = 0;
let currentGroupId = "";
let groupLevel = 0;
let fieldCounter = 0;
const parsedFields: ParsedField[] = [];

// Start a new field group
function startFieldGroup(name: string, value: any, size: number, hexValue: string) {
  const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  currentGroupId = groupId;
  groupLevel++;
  
  addParsedField(name, value, size, hexValue, groupId, groupLevel - 1, true);
  
  return { groupId, level: groupLevel };
}

// End current field group
function endFieldGroup() {
  groupLevel = Math.max(0, groupLevel - 1);
  currentGroupId = ""; // Reset for safety
}

// Update addParsedField to support groups
function addParsedField(
  name: string, 
  value: any, 
  size: number, 
  hexValue: string,
  groupId: string = currentGroupId,
  level: number = groupLevel,
  isGroupHeader: boolean = false
) {
  const startPos = fieldPosition;
  fieldPosition += size * 2; // Multiply by 2 for hex string representation
  
  parsedFields.push({
    name,
    value,
    startPos,
    endPos: fieldPosition,
    size,
    hexValue,
    groupId,
    level,
    isGroupHeader
  });
  
  return { value, newPosition: fieldPosition };
}

// Add the createGroup function that's referenced but not defined
function createGroup(name: string, size: number, parentGroupId: string = ""): { groupId: string, level: number } {
  const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Add a group header field
  addParsedField(
    name, 
    `Group: ${name}`, 
    size,
    "", // No hex value for group headers
    parentGroupId,
    groupLevel,
    true // Mark as a group header
  );
  
  // Increment the group level for child elements
  groupLevel++;
  
  // Return the group identifier for reference
  return { 
    groupId, 
    level: groupLevel - 1 
  };
}

// Add a function to parse the transaction type that's referenced
function parseTxType(hexString: string) {
  const txTypeHex = hexString.substring(0, 2); // First byte is type
  const txType = parseInt(txTypeHex, 16);
  
  // Update field position
  fieldPosition += 2;
  
  return {
    type: txType,
    typeName: getTxTypeName(txType),
    hex: txTypeHex
  };
}

/**
 * Parse a transaction hash into a structured transaction object
 */
export function parseTransactionHash(hash: string): FuelTransaction | { error: string } {
  try {
    // Clean the hash if it has 0x prefix
    const cleanHash = hash.startsWith('0x') ? hash.substring(2) : hash;
    
    // Initialize parsing state
    fieldPosition = 0;
    currentGroupId = "";
    groupLevel = 0;
    // Clear the parsedFields array
    parsedFields.length = 0;
    
    // Read transaction type (first byte)
    const txTypeHex = cleanHash.substring(0, 2);
    const txType = parseInt(txTypeHex, 16);
    
    // Add transaction type field
    addParsedField('Transaction Type', getTxTypeName(txType), 1, txTypeHex);
    
    // Parse the rest of the transaction based on its type
    let transaction: FuelTransaction;
    
    // Switch based on transaction type
    switch (txType) {
      case 0: // Script transaction
        transaction = parseScriptTransaction(cleanHash, "") as unknown as ScriptTransaction;
        break;
      // Add other transaction types as needed
      default:
        return { error: `Unsupported transaction type: ${txType}` };
    }
    
    // Attach parsed fields to the transaction object
    const result = {
      ...transaction,
      parsedFields: parsedFields.slice(), // Make a copy to avoid references
      rawHex: cleanHash
    };
    
    console.log('Parsed transaction with fields:', result);
    return result;
  } catch (error) {
    console.error('Error parsing transaction hash:', error);
    return { error: `Failed to parse transaction: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Parse a Script Transaction and track field positions
 */
function parseScriptTransaction(hexString: string, parentGroupId: string): ParsedTransaction {
  try {
    // Reset tracking
    fieldPosition = 2; // Start after type byte
    parsedFields.length = 0;
    groupLevel = 0;
    currentGroupId = "";
    
    // Start Script Transaction group
    const { groupId: scriptGroup } = startFieldGroup('Script Transaction', 'Script Transaction Fields', 1, parentGroupId);
    
    // Define all groups upfront to avoid reference errors
    const { groupId: policiesGroup } = startFieldGroup('Policies', 'Policy Fields', 2, scriptGroup);
    const { groupId: inputsGroup } = startFieldGroup('Inputs', 'Input Fields', 2, scriptGroup);
    const { groupId: outputsGroup } = startFieldGroup('Outputs', 'Output Fields', 2, scriptGroup);
    const { groupId: witnessesGroup } = startFieldGroup('Witnesses', 'Witness Fields', 2, scriptGroup);
    
    // Safely add fields
    let gasLimit = 0;
    try {
      // Get gas limit
      const gasLimitHex = hexString.substring(fieldPosition, fieldPosition + BYTE_SIZES.GAS_LIMIT * 2);
      gasLimit = parseInt(gasLimitHex, 16);
      addParsedField('Gas Limit', gasLimit.toString(), BYTE_SIZES.GAS_LIMIT, gasLimitHex, scriptGroup);
    } catch (e) {
      console.error("Error parsing gas limit:", e);
    }
    
    // Policies section (level 2)
    const { groupId: policyDetailsGroup } = startFieldGroup('Policy Details', 'Individual Policies', 3, policiesGroup);
    
    // Policies
    const policyTypesHex = hexString.substring(fieldPosition, fieldPosition + BYTE_SIZES.POLICY_TYPES * 2);
    const policyTypes = parseInt(policyTypesHex, 16);
    addParsedField('Policy Types', policyTypes.toString(), BYTE_SIZES.POLICY_TYPES, policyTypesHex, policyDetailsGroup);
    
    // Inputs section (level 2)
    const { groupId: inputDetailsGroup } = startFieldGroup('Input Details', 'Individual Inputs', 3, inputsGroup);
    
    // Inputs count
    const inputsCountHex = hexString.substring(fieldPosition, fieldPosition + BYTE_SIZES.INPUTS_COUNT * 2);
    const inputsCount = parseInt(inputsCountHex, 16);
    addParsedField('Inputs Count', inputsCount.toString(), BYTE_SIZES.INPUTS_COUNT, inputsCountHex, inputDetailsGroup);
    
    // Outputs count
    const outputsCountHex = hexString.substring(fieldPosition, fieldPosition + BYTE_SIZES.OUTPUTS_COUNT * 2);
    const outputsCount = parseInt(outputsCountHex, 16);
    addParsedField('Outputs Count', outputsCount.toString(), BYTE_SIZES.OUTPUTS_COUNT, outputsCountHex, scriptGroup);
    
    // Parse remaining data (simplified)
    if (fieldPosition < hexString.length) {
      const remainingHex = hexString.substring(fieldPosition);
      addParsedField('Remaining Transaction Data', "Outputs and Witnesses", remainingHex.length / 2, remainingHex, scriptGroup);
    }
    
    // End Script Transaction group
    endFieldGroup();
    
    // Return the transaction object
    return {
      type: TransactionType.Script,
      parsedFields: parsedFields.slice(),
      gasLimit,
      receiptsRoot: "0x",
      scriptLength: 0,
      script: "0x",
      scriptDataLength: 0,
      scriptData: "0x",
      policies: [],
      inputsCount: inputsCount,
      inputs: [],
      outputsCount: outputsCount,
      outputs: [],
      witnessesCount: 0,
      witnesses: [],
    };
  } catch (error) {
    console.error('Error parsing Script transaction:', error);
    throw new Error(`Script transaction parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a Fuel integer from its hex representation
 * In Fuel, integers are big-endian and right-aligned to 8 bytes
 * @param hexValue The 8-byte hex string
 * @param logicalSize The actual logical size of the integer in bytes (1, 2, 4, or 8)
 */
function parseFuelInteger(hexValue: string, logicalSize: number = 8): number {
  try {
    // For integers smaller than 8 bytes, we need to take only the last N bytes
    const actualHexValue = hexValue.slice(-logicalSize * 2);
    console.log(`Parsing integer value: 0x${actualHexValue} (extracted from 0x${hexValue})`);
    
    // Try to parse as BigInt first
    const bigValue = BigInt(`0x${actualHexValue}`);
    // Return number if in safe range
    if (bigValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(bigValue);
    }
    console.warn(`Value too large for Number: 0x${actualHexValue}`);
    return Number.MAX_SAFE_INTEGER;
  } catch (error) {
    console.error(`Error parsing Fuel integer: 0x${hexValue} with logical size ${logicalSize}`, error);
    return 0;
  }
}

// Other parsing functions remain similar but adjusted for the correct byte sizes and formats
// ...

// Helper functions for reading bytes from the hex string
function readBytes(hexString: string, startPosition: number, length: number): { value: string, newPosition: number } {
  const endPosition = startPosition + length * 2;
  // Make sure we don't go past the end of the string
  const actualEndPosition = Math.min(endPosition, hexString.length);
  const bytes = hexString.substring(startPosition, actualEndPosition);
  return { value: bytes, newPosition: actualEndPosition };
}

function readBytes32(hexString: string, position: number): { value: string, newPosition: number } {
  return readBytes(hexString, position, BYTE_SIZES.BYTE32);
}

function readUint(hexString: string, position: number, byteLength: number = BYTE_SIZES.INTEGER): { value: number, newPosition: number } {
  // In Fuel, all integers (uint8, uint16, uint32, uint64) are right-aligned to 8 bytes
  const { value: hexValue, newPosition } = readBytes(hexString, position, byteLength);
  
  try {
    // Parse as BigInt first to handle large values
    const bigValue = BigInt(`0x${hexValue}`);
    // Convert to number if it's within safe range
    if (bigValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return { value: Number(bigValue), newPosition };
    }
    console.warn(`Large integer value: 0x${hexValue}, returning as BigInt string`);
    return { value: Number.MAX_SAFE_INTEGER, newPosition };
  } catch (error) {
    console.error(`Failed to parse integer from hex value: 0x${hexValue}`, error);
    throw new Error(`Invalid uint value at position ${position}: 0x${hexValue}`);
  }
}

// Parse inputs based on the input count
function parseInputs(hexString: string, startPosition: number, count: number): { inputs: Input[], newPosition: number } {
  let currentPosition = startPosition;
  const inputs: Input[] = [];
  
  for (let i = 0; i < count; i++) {
    const { input, newPosition } = parseInput(hexString, currentPosition);
    inputs.push(input);
    currentPosition = newPosition;
  }
  
  return { inputs, newPosition: currentPosition };
}

// Parse a single input
function parseInput(hexString: string, startPosition: number): { input: Input, newPosition: number } {
  let currentPosition = startPosition;
  
  // Read input type
  const { value: inputType, newPosition: pos1 } = readUint(hexString, currentPosition, 1);
  currentPosition = pos1;
  
  let input: Input;
  
  switch (inputType) {
    case InputType.Coin: {
      // Parse coin input fields
      const { value: txID, newPosition: pos2 } = readBytes32(hexString, currentPosition);
      currentPosition = pos2;
      
      const { value: outputIndex, newPosition: pos3 } = readUint(hexString, currentPosition, 1);
      currentPosition = pos3;
      
      const { value: owner, newPosition: pos4 } = readBytes32(hexString, currentPosition);
      currentPosition = pos4;
      
      const { value: amount, newPosition: pos5 } = readUint(hexString, currentPosition, 8);
      currentPosition = pos5;
      
      const { value: assetId, newPosition: pos6 } = readBytes32(hexString, currentPosition);
      currentPosition = pos6;
      
      const { value: txPointerBlockHeight, newPosition: pos7 } = readUint(hexString, currentPosition, 4);
      currentPosition = pos7;
      
      const { value: txPointerTxIndex, newPosition: pos8 } = readUint(hexString, currentPosition, 2);
      currentPosition = pos8;
      
      const { value: witnessIndex, newPosition: pos9 } = readUint(hexString, currentPosition, 1);
      currentPosition = pos9;
      
      const { value: predicateGasUsed, newPosition: pos10 } = readUint(hexString, currentPosition, 8);
      currentPosition = pos10;
      
      const { value: predicateLength, newPosition: pos11 } = readUint(hexString, currentPosition, 4);
      currentPosition = pos11;
      
      const { value: predicateDataLength, newPosition: pos12 } = readUint(hexString, currentPosition, 4);
      currentPosition = pos12;
      
      const { value: predicate, newPosition: pos13 } = readBytes(hexString, currentPosition, predicateLength);
      currentPosition = pos13;
      
      const { value: predicateData, newPosition: pos14 } = readBytes(hexString, currentPosition, predicateDataLength);
      currentPosition = pos14;
      
      input = {
        type: InputType.Coin,
        txID,
        outputIndex,
        owner,
        amount,
        assetId,
        txPointer: {
          blockHeight: txPointerBlockHeight,
          txIndex: txPointerTxIndex
        },
        witnessIndex,
        predicateGasUsed,
        predicateLength,
        predicateDataLength,
        predicate: `0x${predicate}`,
        predicateData: `0x${predicateData}`
      };
      break;
    }
    case InputType.Contract: {
      // Parse contract input fields
      const { value: txID, newPosition: pos2 } = readBytes32(hexString, currentPosition);
      currentPosition = pos2;
      
      const { value: outputIndex, newPosition: pos3 } = readUint(hexString, currentPosition, 1);
      currentPosition = pos3;
      
      const { value: balanceRoot, newPosition: pos4 } = readBytes32(hexString, currentPosition);
      currentPosition = pos4;
      
      const { value: stateRoot, newPosition: pos5 } = readBytes32(hexString, currentPosition);
      currentPosition = pos5;
      
      const { value: txPointerBlockHeight, newPosition: pos6 } = readUint(hexString, currentPosition, 4);
      currentPosition = pos6;
      
      const { value: txPointerTxIndex, newPosition: pos7 } = readUint(hexString, currentPosition, 2);
      currentPosition = pos7;
      
      const { value: contractID, newPosition: pos8 } = readBytes32(hexString, currentPosition);
      currentPosition = pos8;
      
      input = {
        type: InputType.Contract,
        txID,
        outputIndex,
        balanceRoot,
        stateRoot,
        txPointer: {
          blockHeight: txPointerBlockHeight,
          txIndex: txPointerTxIndex
        },
        contractID
      };
      break;
    }
    case InputType.Message: {
      // Parse message input fields
      // ...similar implementation
      input = { type: InputType.Message, unknown: true };
      break;
    }
    default:
      input = { type: inputType, unknown: true };
  }

  return { input, newPosition: currentPosition };
}

// Parse outputs based on the output count
function parseOutputs(hexString: string, startPosition: number, count: number): { outputs: Output[], newPosition: number } {
  let currentPosition = startPosition;
  const outputs: Output[] = [];
  
  for (let i = 0; i < count; i++) {
    const { output, newPosition } = parseOutput(hexString, currentPosition);
    outputs.push(output);
    currentPosition = newPosition;
  }
  
  return { outputs, newPosition: currentPosition };
}

// Parse a single output
function parseOutput(hexString: string, startPosition: number): { output: Output, newPosition: number } {
  let currentPosition = startPosition;
  
  // Read output type
  const { value: outputType, newPosition: pos1 } = readUint(hexString, currentPosition, 1);
  currentPosition = pos1;
  
  let output: Output;
  
  switch (outputType) {
    case OutputType.Coin: {
      // Parse coin output fields
      const { value: to, newPosition: pos2 } = readBytes32(hexString, currentPosition);
      currentPosition = pos2;
      
      const { value: amount, newPosition: pos3 } = readUint(hexString, currentPosition, 8);
      currentPosition = pos3;
      
      const { value: assetId, newPosition: pos4 } = readBytes32(hexString, currentPosition);
      currentPosition = pos4;
      
      output = {
        type: OutputType.Coin,
        to,
        amount,
        assetId
      };
      break;
    }
    case OutputType.Contract: {
      // Parse contract output fields
      const { value: inputIndex, newPosition: pos2 } = readUint(hexString, currentPosition, 1);
      currentPosition = pos2;
      
      const { value: balanceRoot, newPosition: pos3 } = readBytes32(hexString, currentPosition);
      currentPosition = pos3;
      
      const { value: stateRoot, newPosition: pos4 } = readBytes32(hexString, currentPosition);
      currentPosition = pos4;
      
      output = {
        type: OutputType.Contract,
        inputIndex,
        balanceRoot,
        stateRoot
      };
      break;
    }
    case OutputType.Change: {
      // Parse change output fields
      const { value: to, newPosition: pos2 } = readBytes32(hexString, currentPosition);
      currentPosition = pos2;
      
      const { value: amount, newPosition: pos3 } = readUint(hexString, currentPosition, 8);
      currentPosition = pos3;
      
      const { value: assetId, newPosition: pos4 } = readBytes32(hexString, currentPosition);
      currentPosition = pos4;
      
      output = {
        type: OutputType.Change,
        to,
        amount,
        assetId
      };
      break;
    }
    // Add other output types as needed
    default:
      output = { type: outputType, unknown: true };
  }

  return { output, newPosition: currentPosition };
}

// Parse witnesses based on the witness count
function parseWitnesses(hexString: string, startPosition: number, count: number): { witnesses: Witness[], newPosition: number } {
  let currentPosition = startPosition;
  const witnesses: Witness[] = [];
  
  for (let i = 0; i < count; i++) {
    const { witness, newPosition } = parseWitness(hexString, currentPosition);
    witnesses.push(witness);
    currentPosition = newPosition;
  }
  
  return { witnesses, newPosition: currentPosition };
}

// Parse a single witness
function parseWitness(hexString: string, startPosition: number): { witness: Witness, newPosition: number } {
  let currentPosition = startPosition;
  
  // Read witness data length
  const { value: dataLength, newPosition: pos1 } = readUint(hexString, currentPosition, 4);
  currentPosition = pos1;
  
  // Read witness data
  const { value: data, newPosition: pos2 } = readBytes(hexString, currentPosition, dataLength);
  currentPosition = pos2;
  
  return {
    witness: {
      dataLength,
      data: `0x${data}`
    },
    newPosition: currentPosition
  };
}

// Parse policies based on the policy types
function parsePolicies(hexString: string, startPosition: number, policyTypes: number): { policies: Policy[], newPosition: number } {
  let currentPosition = startPosition;
  const policies: Policy[] = [];
  
  // Check each bit in the policy types bitmap
  if (policyTypes & PolicyType.Tip) {
    // Read tip policy
    const { value: tip, newPosition } = readUint(hexString, currentPosition, 8);
    currentPosition = newPosition;
    policies.push({ type: PolicyType.Tip, tip });
  }
  
  if (policyTypes & PolicyType.WitnessLimit) {
    // Read witness limit policy
    const { value: witnessLimit, newPosition } = readUint(hexString, currentPosition, 4);
    currentPosition = newPosition;
    policies.push({ type: PolicyType.WitnessLimit, witnessLimit });
  }
  
  if (policyTypes & PolicyType.Maturity) {
    // Read maturity policy
    const { value: maturity, newPosition } = readUint(hexString, currentPosition, 4);
    currentPosition = newPosition;
    policies.push({ type: PolicyType.Maturity, maturity });
  }
  
  if (policyTypes & PolicyType.MaxFee) {
    // Read max fee policy
    const { value: maxFee, newPosition } = readUint(hexString, currentPosition, 8);
    currentPosition = newPosition;
    policies.push({ type: PolicyType.MaxFee, maxFee });
  }
  
  return { policies, newPosition: currentPosition };
}

// Helper to count the number of set bits in a number (ones in binary representation)
function countOnes(initialN: number): number {
  let n = initialN;
  let count = 0;
  while (n > 0) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

// Create, Mint, Upgrade, Upload, and Blob transaction parsers follow similar patterns
// These would need to be implemented based on the Fuel specs

function parseCreateTransaction(hexString: string): CreateTransaction {
  // Implementation for Create transaction
  return {
    type: TransactionType.Create,
    rawHex: `0x${hexString}`,
    bytecodeWitnessIndex: 0,
    salt: "0x",
    storageSlotsCount: 0,
    storageSlots: []
  };
}

function parseMintTransaction(hexString: string): MintTransaction {
  // Implementation for Mint transaction
  return {
    type: TransactionType.Mint,
    rawHex: `0x${hexString}`,
    txPointer: {
      blockHeight: 0,
      txIndex: 0
    },
    inputContract: { type: InputType.Contract, unknown: true },
    outputContract: { type: OutputType.Contract, unknown: true },
    mintAmount: 0,
    mintAssetId: "0x",
    gasPrice: 0
  };
}

function parseUpgradeTransaction(hexString: string): UpgradeTransaction {
  // Implementation for Upgrade transaction
  return {
    type: TransactionType.Upgrade,
    rawHex: `0x${hexString}`,
    upgradePurpose: { type: 0 }
  };
}

function parseUploadTransaction(hexString: string): UploadTransaction {
  // Implementation for Upload transaction
  return {
    type: TransactionType.Upload,
    rawHex: `0x${hexString}`,
    root: "0x",
    witnessIndex: 0,
    subsectionIndex: 0,
    subsectionsNumber: 0,
    proofSetCount: 0,
    proofSet: []
  };
}

function parseBlobTransaction(hexString: string): BlobTransaction {
  // Implementation for Blob transaction
  return {
    type: TransactionType.Blob,
    rawHex: `0x${hexString}`,
    id: "0x",
    witnessIndex: 0
  };
}

// Add the missing getTxTypeName function
function getTxTypeName(type: number): string {
  switch (type) {
    case TransactionType.Script:
      return 'Script';
    case TransactionType.Create:
      return 'Create';
    case TransactionType.Mint:
      return 'Mint';
    case TransactionType.Upgrade:
      return 'Upgrade';
    case TransactionType.Upload:
      return 'Upload';
    case TransactionType.Blob:
      return 'Blob';
    default:
      return `Unknown (${type})`;
  }
}
