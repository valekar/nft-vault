import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftVault } from "../target/types/nft_vault";
import Token, {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction, Keypair, Signer } from "@solana/web3.js";

export const addSols = async (
  provider: anchor.Provider,
  wallet: anchor.web3.PublicKey,
  amount = 2 * anchor.web3.LAMPORTS_PER_SOL
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

export const getAtaForMint = async (
  tokenRecipient: PublicKey,
  mintKey: PublicKey,
  tokenProgramID: PublicKey = new PublicKey(TOKEN_PROGRAM_ID),
  associatedProgramID: PublicKey = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [tokenRecipient.toBuffer(), tokenProgramID.toBuffer(), mintKey.toBuffer()],
    associatedProgramID
  );
};

// mint NFT for testing purpose
export const mintNFT = async (
  provider: anchor.Provider,
  staker: Keypair,
  mintAuthority: Keypair,
  freezeAuthority: Keypair
) => {
  // random mint key for testing purpose
  const mintPair = anchor.web3.Keypair.generate();

  const mintInstruction = Token.createInitializeMintInstruction(
    mintPair.publicKey,
    0,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    TOKEN_PROGRAM_ID
  );

  const [stakerAta, _] = await getAtaForMint(
    staker.publicKey,
    mintPair.publicKey
  );

  const stakerAtaInstruction = Token.createAssociatedTokenAccountInstruction(
    staker.publicKey,
    stakerAta,
    staker.publicKey,
    mintPair.publicKey
  );

  const mintToInstruction = Token.createMintToInstruction(
    mintPair.publicKey,
    stakerAta,
    mintAuthority.publicKey,
    1,
    []
  );

  const txWithSigners: { tx: Transaction; signers?: Signer[] }[] = [];

  const transaction1 = new Transaction();
  transaction1.add(mintInstruction);
  txWithSigners.push({
    tx: transaction1,
    signers: [mintAuthority, freezeAuthority],
  });

  const transaction2 = new Transaction();
  transaction2.add(stakerAtaInstruction);
  txWithSigners.push({ tx: transaction2, signers: [staker] });

  const transaction3 = new Transaction();
  transaction3.add(mintToInstruction);
  txWithSigners.push({ tx: transaction3, signers: [mintAuthority] });

  const tx = await provider.sendAll(txWithSigners);
};
