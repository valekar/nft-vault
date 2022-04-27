# NFT Vault

This is a program for staking any NFTs collection.

## NOTE

- **This program is unaudited. Use at your own risk.**

## Program Design

### Important Accounts

The `nft_vault` which is PDA. Any user who tries to stake NFT will be transferring their NFT to `nft_vault`.

`stake_nft` account which is a PDA, is used to track staking of NFTs for a wallet. So never let go off your wallet once the staking is done. Because for unstaking we are using the same `wallet` publicKey for verification. For every NFT, a `stake_nft` account is created for tracking and storing nft details. Feel free to expand on it or change it based on your requirements

## Instructions

This repo has 4 basic functionalities

1. Initialize
   Use `initialize` instruction for initializing the program
2. Stake
   Users could `stake` their NFTs into the program. This nft-vault program acts as an escrow program.
3. Unstake
   Users could `unstake` their NFTs any time.
4. Release
   Managers or authorities could `release` the NFTs for a staked NFT user

## Interacting from client with Instructions

1. **Initialize**

   Below is a sample instruction on how could initialize the instruction

   ```typescript
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
   ```

2. **Stake**

   To stake NFT into program

   ```typescript
   const instruction = await program.methods
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

   const transaction = new Transaction();
   transaction.add(instruction);

   const tx = await program.provider.sendAndConfirm!(transaction, [staker]);
   console.log("Your transaction signature", tx);
   ```

3. **Unstake**

   You can unstake the easily by doing the following

   ```typescript
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
   ```

4. **Release**

   Release functionality can only be activated by authorities

   ```typescript
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

   const transaction = new Transaction();
   transaction.add(releaseInstruction);

   const tx = await program.provider.sendAndConfirm!(transaction, [
     fakeAuthority,
   ]);
   console.log("Your transaction signature", tx);
   ```

### More Details

For more details on interacting from client refer [tests](https://github.com/valekar/nft-vault/tree/feature/add-readme/tests) folder

## Further Improvements

There are a few more things that could be achieved with this program

### Collection Based Staking

Right now, any NFT can be staked. It is not properly segregated based collection. This could be achieved by verifying a NFT that needs to be staked against an **upgrade-authority** of the mint account.

The **upgrade-authority** for most of the collections remain the same.

### Interest Calculation

The interest calculation is not implemented. This can also implemented.

## Contributions

Feel free to open issues or create PRs if you want to contribute

## License

[MIT](https://github.com/valekar/nft-vault/blob/feature/add-readme/LICENSE)
