import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftVault } from "../target/types/nft_vault";

export const addSols = async (
  provider: anchor.Provider,
  wallet: anchor.web3.PublicKey,
  amount = 1 * anchor.web3.LAMPORTS_PER_SOL
) => {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(wallet, amount),
    "confirmed"
  );
};

export const getNftVaultPda = async (program: Program<NftVault>) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("nft-vault")],
    program.programId
  );
};
