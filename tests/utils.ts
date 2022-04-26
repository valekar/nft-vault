import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftVault } from "../target/types/nft_vault";
import {
  AccountLayout,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MintLayout,
} from "@solana/spl-token";
import { PublicKey, Transaction, Keypair, Signer } from "@solana/web3.js";

import NftVaultIdl from "../target/idl/nft_vault.json";

/** Address of the SPL Token program */
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/** Address of the SPL Associated Token Account program */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const addSols = async (
  provider: anchor.Provider,
  wallet: anchor.web3.PublicKey,
  amount = 3 * anchor.web3.LAMPORTS_PER_SOL
) => {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(wallet, amount),
    "confirmed"
  );
};

export const getNftVaultPda = async (
  programId: PublicKey = new PublicKey(NftVaultIdl.metadata.address)
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("nft-vault")],
    programId
  );
};

export const getStakeNftPda = async (
  stakerKey: PublicKey,
  tokenMint: PublicKey,
  programId: PublicKey = new PublicKey(NftVaultIdl.metadata.address)
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("user-stake"), tokenMint.toBuffer(), stakerKey.toBuffer()],
    programId
  );
};

export const getAtaForMint = async (
  tokenRecipient: PublicKey,
  mintKey: PublicKey,
  tokenProgramID: PublicKey = TOKEN_PROGRAM_ID,
  associatedProgramID: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [tokenRecipient.toBuffer(), tokenProgramID.toBuffer(), mintKey.toBuffer()],
    associatedProgramID
  );
};

// mint NFT for testing purpose
export const mintNFT = async (
  provider: anchor.Provider,
  payer: Keypair,
  mintAuthority: Keypair,
  freezeAuthority: Keypair
) => {
  // random mint key for testing purpose
  const tokenMintKeypair = anchor.web3.Keypair.generate();

  const lamportsForMint =
    await provider.connection.getMinimumBalanceForRentExemption(
      MintLayout.span
    );

  const createMintAccountInstruction = anchor.web3.SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: MintLayout.span,
    fromPubkey: payer.publicKey,
    newAccountPubkey: tokenMintKeypair.publicKey,
    lamports: lamportsForMint,
  });

  const mintInstruction = createInitializeMintInstruction(
    tokenMintKeypair.publicKey,
    0,
    mintAuthority.publicKey,
    freezeAuthority.publicKey
  );

  const [payerAta, _] = await getAtaForMint(
    payer.publicKey,
    tokenMintKeypair.publicKey
  );

  const stakerAtaInstruction = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    payerAta,
    payer.publicKey,
    tokenMintKeypair.publicKey
  );

  const mintToInstruction = createMintToInstruction(
    tokenMintKeypair.publicKey,
    payerAta,
    payer.publicKey,
    1,
    []
  );

  const txWithSigners: {
    tx: Transaction;
    signers?: Signer[];
  }[] = [];

  const transaction1 = new Transaction();
  transaction1.add(createMintAccountInstruction);
  transaction1.add(mintInstruction);
  transaction1.add(stakerAtaInstruction);
  transaction1.add(mintToInstruction);

  txWithSigners.push({
    tx: transaction1,
    signers: [payer, tokenMintKeypair], // first has to be payer because this account is used for deduction payment in any transaction
  });

  await provider.sendAll!(txWithSigners);

  return {
    payerAta: payerAta,
    tokenMint: tokenMintKeypair.publicKey,
  };
};

export const getRawTokenAccount = async (
  provider: anchor.Provider,
  address: PublicKey
) => {
  const account = await provider.connection.getAccountInfo(address);
  if (account == null) {
    return null;
  }
  return AccountLayout.decode(account.data);
};
