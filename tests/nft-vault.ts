import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { NftVault } from "../target/types/nft_vault";
import { Transaction } from "@solana/web3.js";
import { addSols, getNftVaultPda } from "./utils";

describe("nft-vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NftVault as Program<NftVault>;
  const fakeAuthority = anchor.web3.Keypair.generate();
  const staker = anchor.web3.Keypair.generate();

  before("before call", async () => {
    await addSols(program.provider, fakeAuthority.publicKey);
    await addSols(program.provider, staker.publicKey);

    //await mintNFT(program.provider, staker, staker, staker);
  });

  it("Is initialized!", async () => {
    const [nftVault, _] = await getNftVaultPda(program);

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
});
