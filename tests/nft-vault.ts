import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftVault } from "../target/types/nft_vault";
import { Transaction } from "@solana/web3.js";
import {
  addSols,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAtaForMint,
  getNftVaultPda,
  getStakeNftPda,
  getRawTokenAccount,
  mintNFT,
  TOKEN_PROGRAM_ID,
} from "./utils";
import { assert } from "chai";

import { u64 } from "@project-serum/borsh";

describe("nft-vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  let mint = null;
  let stakerAta = null;

  const program = anchor.workspace.NftVault as Program<NftVault>;
  const fakeAuthority = anchor.web3.Keypair.generate();
  const staker = anchor.web3.Keypair.generate();

  before("before call", async () => {
    await addSols(program.provider, fakeAuthority.publicKey);
    await addSols(program.provider, staker.publicKey);

    const { payerAta, tokenMint } = await mintNFT(
      program.provider,
      staker,
      staker,
      staker
    );
    mint = tokenMint;
    stakerAta = payerAta;
  });

  it("Is initialized!", async () => {
    const [nftVault, _] = await getNftVaultPda();

    const instruction = await program.methods
      .initialize()
      .accounts({
        authority: fakeAuthority.publicKey,
        nftVault: nftVault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction();
    transaction.add(instruction);

    const tx = await program.provider.sendAndConfirm!(transaction, [
      fakeAuthority,
    ]);
    console.log("Your transaction signature", tx);
  });

  it("user should stake", async () => {
    const [nftVault, _1] = await getNftVaultPda();
    const [stakeNft, _2] = await getStakeNftPda(staker.publicKey, mint);

    const [nftVaultAta, _3] = await getAtaForMint(nftVault, mint);

    const instruction = await getStakeInstruction(
      program,
      staker,
      stakeNft,
      stakerAta,
      mint,
      nftVaultAta,
      nftVault
    );

    const transaction = new Transaction();
    transaction.add(instruction);

    const tx = await program.provider.sendAndConfirm!(transaction, [staker]);
    console.log("Your transaction signature", tx);

    const nftAtaData = await getRawTokenAccount(program.provider, nftVaultAta);

    assert.ok(
      nftAtaData.amount.toString() === "1",
      "Nft should be staked into the nft vault"
    );

    const stakerAtaData = await getRawTokenAccount(program.provider, stakerAta);
    assert.ok(
      stakerAtaData.amount.toString() === "0",
      "User nft should be zero"
    );
  });

  it("user should unstake", async () => {
    const [nftVault, _1] = await getNftVaultPda();
    const [stakeNft, _2] = await getStakeNftPda(staker.publicKey, mint);

    const [nftVaultAta, _3] = await getAtaForMint(nftVault, mint);

    const instruction = await program.methods
      .unstake()
      .accounts({
        staker: staker.publicKey,
        stakeNft: stakeNft,
        stakerAta: stakerAta,
        tokenMint: mint,
        nftVaultAta: nftVaultAta,
        nftVault: nftVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction();
    transaction.add(instruction);

    const tx = await program.provider.sendAndConfirm!(transaction, [staker]);
    console.log("Your transaction signature", tx);

    const nftAtaData = await getRawTokenAccount(program.provider, nftVaultAta);
    assert.ok(
      nftAtaData.amount.toString() === "0",
      "Nft should be unstaked into the nft vault"
    );

    const stakerAtaData = await getRawTokenAccount(program.provider, stakerAta);
    assert.ok(stakerAtaData.amount.toString() === "1", "User nft should be 1");
  });

  it("Authority should release the staked nft token to user", async () => {
    const [nftVault, _1] = await getNftVaultPda();
    const [stakeNft, _2] = await getStakeNftPda(staker.publicKey, mint);

    const [nftVaultAta, _3] = await getAtaForMint(nftVault, mint);

    /****restaking *******/
    // restaking as it was unstaked in the above unit test case
    const stakeInstruction = await getStakeInstruction(
      program,
      staker,
      stakeNft,
      stakerAta,
      mint,
      nftVaultAta,
      nftVault
    );

    const transaction1 = new Transaction();
    transaction1.add(stakeInstruction);
    await program.provider.sendAndConfirm!(transaction1, [staker]);
    /****restaking *******/

    const releaseInstruction = await program.methods
      .release()
      .accounts({
        authority: fakeAuthority.publicKey,
        nftVault: nftVault,
        stakeNft: stakeNft,
        stakerAta: stakerAta,
        nftVaultAta: nftVaultAta,
        staker: staker.publicKey,
        tokenMint: mint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction2 = new Transaction();
    transaction2.add(releaseInstruction);

    const tx = await program.provider.sendAndConfirm!(transaction2, [
      fakeAuthority,
    ]);
    console.log("Your transaction signature", tx);

    const nftAtaData = await getRawTokenAccount(program.provider, nftVaultAta);
    assert.ok(
      nftAtaData.amount.toString() === "0",
      "Nft should be unstaked into the nft vault"
    );

    const stakerAtaData = await getRawTokenAccount(program.provider, stakerAta);
    assert.ok(stakerAtaData.amount.toString() === "1", "User nft should be 1");
  });
});

const getStakeInstruction = async (
  program: anchor.Program<NftVault>,
  staker: anchor.web3.Keypair,
  stakeNft: anchor.web3.PublicKey,
  stakerAta: any,
  mint: any,
  nftVaultAta: anchor.web3.PublicKey,
  nftVault: anchor.web3.PublicKey
) => {
  return await program.methods
    .stake()
    .accounts({
      staker: staker.publicKey,
      stakeNft: stakeNft,
      stakerAta: stakerAta,
      tokenMint: mint,
      nftVaultAta: nftVaultAta,
      nftVault: nftVault,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction();
};
