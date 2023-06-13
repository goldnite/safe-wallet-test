import { ethers } from 'ethers';
import Safe, { EthersAdapter, SafeFactory } from '@safe-global/protocol-kit';
import dotenv from 'dotenv';
dotenv.config();

const RPC_URL = 'https://eth-goerli.public.blastapi.io';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    'https://eth-goerli.public.blastapi.io'
  ); //1
  const signerWallet = new ethers.Wallet(
    process.env.OWNER_1_PRIVATE_KEY!,
    provider
  ); //2
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signerWallet,
  }); //3

  const safeFactory = await SafeFactory.create({ ethAdapter }); //4
  const safeSdk: Safe = await safeFactory.deploySafe({
    safeAccountConfig: {
      threshold: 2,
      owners: [
        '0x5FF82d0E7d52945DE1a6CFe48BcadAbE71E29db8',
        '0x54BC990Bca0E27b169F19EB782cCd29C4023E0D0',
      ],
    },
  }); //5
  console.log(await safeSdk.getAddress());
}
main();
