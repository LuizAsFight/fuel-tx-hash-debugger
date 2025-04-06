// Transaction types based on Fuel specs
export enum TransactionType {
  Script = 0,
  Create = 1,
  Mint = 2,
  Upgrade = 3,
  Upload = 4,
  Blob = 5,
}

export enum InputType {
  Coin = 0,
  Contract = 1,
  Message = 2,
}

export enum OutputType {
  Coin = 0,
  Contract = 1,
  Change = 2,
  Variable = 3,
  ContractCreated = 4,
  Message = 5,
}

export enum PolicyType {
  Tip = 1,
  WitnessLimit = 2,
  Maturity = 4,
  MaxFee = 8,
}

// Input Types
export interface InputBase {
  type: InputType;
}

export interface InputCoin extends InputBase {
  type: InputType.Coin;
  txID: string;
  outputIndex: number;
  owner: string;
  amount: number;
  assetId: string;
  txPointer: TxPointer;
  witnessIndex: number;
  predicateGasUsed: number;
  predicateLength: number;
  predicateDataLength: number;
  predicate: string;
  predicateData: string;
}

export interface InputContract extends InputBase {
  type: InputType.Contract;
  txID: string;
  outputIndex: number;
  balanceRoot: string;
  stateRoot: string;
  txPointer: TxPointer;
  contractID: string;
}

export interface InputMessage extends InputBase {
  type: InputType.Message;
  sender: string;
  recipient: string;
  amount: number;
  nonce: string;
  witnessIndex: number;
  predicateGasUsed: number;
  dataLength: number;
  predicateLength: number;
  predicateDataLength: number;
  data: string;
  predicate: string;
  predicateData: string;
}

export interface UnknownInput {
  type: number;
  unknown: boolean;
}

export type Input = InputCoin | InputContract | InputMessage | UnknownInput;

// Output Types
export interface OutputBase {
  type: OutputType;
}

export interface OutputCoin extends OutputBase {
  type: OutputType.Coin;
  to: string;
  amount: number;
  assetId: string;
}

export interface OutputContract extends OutputBase {
  type: OutputType.Contract;
  inputIndex: number;
  balanceRoot: string;
  stateRoot: string;
}

export interface OutputChange extends OutputBase {
  type: OutputType.Change;
  to: string;
  amount: number;
  assetId: string;
}

export interface OutputVariable extends OutputBase {
  type: OutputType.Variable;
  to: string;
  amount: number;
  assetId: string;
}

export interface OutputContractCreated extends OutputBase {
  type: OutputType.ContractCreated;
  contractID: string;
  stateRoot: string;
}

export interface OutputMessage extends OutputBase {
  type: OutputType.Message;
  recipient: string;
  amount: number;
}

export interface UnknownOutput {
  type: number;
  unknown: boolean;
}

export type Output = 
  | OutputCoin 
  | OutputContract 
  | OutputChange 
  | OutputVariable 
  | OutputContractCreated 
  | OutputMessage 
  | UnknownOutput;

// Policy Types
export interface PolicyBase {
  type: PolicyType;
}

export interface TipPolicy extends PolicyBase {
  type: PolicyType.Tip;
  tip: number;
}

export interface WitnessLimitPolicy extends PolicyBase {
  type: PolicyType.WitnessLimit;
  witnessLimit: number;
}

export interface MaturityPolicy extends PolicyBase {
  type: PolicyType.Maturity;
  maturity: number;
}

export interface MaxFeePolicy extends PolicyBase {
  type: PolicyType.MaxFee;
  maxFee: number;
}

export interface UnknownPolicy {
  type: number;
  unknown: boolean;
}

export type Policy =
  | TipPolicy
  | WitnessLimitPolicy
  | MaturityPolicy
  | MaxFeePolicy
  | UnknownPolicy;

// Transaction Pointer
export interface TxPointer {
  blockHeight: number;
  txIndex: number;
}

// Common transaction fields
export interface BaseTransaction {
  type: number;
  policyTypes?: number;
  inputsCount?: number;
  outputsCount?: number;
  witnessesCount?: number;
  policies?: Policy[];
  inputs?: Input[];
  outputs?: Output[];
  witnesses?: Witness[];
  rawHex?: string;
  error?: string;
}

// Script Transaction
export interface ScriptTransaction extends BaseTransaction {
  type: TransactionType.Script;
  scriptGasLimit: string;
  receiptsRoot: string;
  scriptLength: number;
  scriptDataLength: number;
  script: string;
  scriptData: string;
}

// Create Transaction
export interface CreateTransaction extends BaseTransaction {
  type: TransactionType.Create;
  bytecodeWitnessIndex: number;
  salt: string;
  storageSlotsCount: number;
  storageSlots: Array<[string, string]>;
}

// Mint Transaction
export interface MintTransaction extends BaseTransaction {
  type: TransactionType.Mint;
  txPointer: {
    blockHeight: number;
    txIndex: number;
  };
  inputContract: Input;
  outputContract: Output;
  mintAmount: number;
  mintAssetId: string;
  gasPrice: number;
}

// Upgrade Transaction
export interface UpgradeTransaction extends BaseTransaction {
  type: TransactionType.Upgrade;
  upgradePurpose: {
    type: number;
    consensusParameters?: string;
    bytecodeRoot?: string;
  };
}

// Upload Transaction
export interface UploadTransaction extends BaseTransaction {
  type: TransactionType.Upload;
  root: string;
  witnessIndex: number;
  subsectionIndex: number;
  subsectionsNumber: number;
  proofSetCount: number;
  proofSet: string[];
}

// Blob Transaction
export interface BlobTransaction extends BaseTransaction {
  type: TransactionType.Blob;
  id: string;
  witnessIndex: number;
}

// The main transaction union type
export type FuelTransaction = 
  | ScriptTransaction 
  | CreateTransaction 
  | MintTransaction 
  | UpgradeTransaction 
  | UploadTransaction 
  | BlobTransaction 
  | BaseTransaction;

// Witness
export interface Witness {
  dataLength: number;
  data: string;
}
