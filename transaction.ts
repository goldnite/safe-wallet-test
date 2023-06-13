import { ethers } from 'ethers';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { SafeTransactionDataPartial } from '@safe-global/safe-core-sdk-types';
import dotenv from 'dotenv';
dotenv.config();

import CONTRACT_ABI from './abi.json';

const RPC_URL = 'https://eth-goerli.public.blastapi.io';
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = '0xf2015f8ce5885c023c807a58ce1b820b8ca432bd';

const txServiceUrl = 'https://safe-transaction-goerli.safe.global';
const SAFE_ADDRESS = '0xc8081Ed475814220e80851969Ff584866f8Cb8Df';

async function main() {
  // declare signers
  const signer1 = new ethers.Wallet(process.env.OWNER_1_PRIVATE_KEY!, provider);
  const signer2 = new ethers.Wallet(process.env.OWNER_2_PRIVATE_KEY!, provider);
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider,
  });
  const ethAdapterWithSigner1 = new EthersAdapter({
    ethers,
    signerOrProvider: signer1,
  });
  const ethAdapterWithSigner2 = new EthersAdapter({
    ethers,
    signerOrProvider: signer2,
  });

  // declare contract
  const contract: ethers.Contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );
  // Create a draft Tx to transfer 10 FMT to 0x54BC990Bca0E27b169F19EB782cCd29C4023E0D0
  const draftTx = await contract.populateTransaction.transfer(
    '0x54BC990Bca0E27b169F19EB782cCd29C4023E0D0',
    ethers.BigNumber.from('10000000000000000000')
  );

  // Initialize safe sdk
  const safeService = new SafeApiKit({
    txServiceUrl,
    ethAdapter: ethAdapter,
  });

  const safeSdkWithSigner1 = await Safe.create({
    ethAdapter: ethAdapterWithSigner1,
    safeAddress: SAFE_ADDRESS,
  });
  const safeSdkWithSigner2 = await Safe.create({
    ethAdapter: ethAdapterWithSigner2,
    safeAddress: SAFE_ADDRESS,
  });

  // create new transaction
  const safeTransactionData: SafeTransactionDataPartial = {
    to: draftTx.to!,
    data: draftTx.data!,
    value: '0',
  };
  const safeTransaction = await safeSdkWithSigner1.createTransaction({
    safeTransactionData,
  });
  const testTxHash = await safeSdkWithSigner1.getTransactionHash(
    safeTransaction
  );

  // Signer1 signs tx and propose it to safe wallet
  const senderSignature = await safeSdkWithSigner1.signTransactionHash(
    testTxHash
  );
  await safeService.proposeTransaction({
    safeAddress: SAFE_ADDRESS,
    safeTransactionData: safeTransaction.data,
    safeTxHash: testTxHash,
    senderAddress: signer1.address,
    senderSignature: senderSignature.data,
    origin: 'Send 10 FMT to 0x54BC990Bca0E27b169F19EB782cCd29C4023E0D0',
  });

  // Signer2 signs tx and send it to safe wallet
  // const pendingTxs = await safeService.getPendingTransactions(SAFE_ADDRESS);
  let signature = await safeSdkWithSigner2.signTransactionHash(testTxHash);
  await safeService.confirmTransaction(testTxHash, signature.data);

  // Signer 2 execute the tx
  const safeTransactionToExec = await safeService.getTransaction(testTxHash);
  console.log(safeTransactionToExec);
  const isValidTx = await safeSdkWithSigner2.isValidTransaction(
    safeTransactionToExec
  );
  if (isValidTx) {
    const executeTxResponse = await safeSdkWithSigner2.executeTransaction(
      safeTransactionToExec
    );
    const receipt =
      executeTxResponse.transactionResponse &&
      (await executeTxResponse.transactionResponse.wait());
    console.log(receipt);
  } else {
    console.log('Something went wrong');
  }
}
main();
