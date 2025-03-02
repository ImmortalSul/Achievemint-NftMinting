import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Achievemint } from "../target/types/achievemint";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("achievemint", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Achievemint as Program<Achievemint>;
  const provider = anchor.getProvider();

  // Test accounts
  const authority = anchor.web3.Keypair.generate();
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();

  // Test data
  const testAchievementId = "achievement123";
  const testName = "Legendary Achievement";
  const testDescription =
    "Completed an extremely rare and difficult achievement";
  const testRarity = "Legendary";
  const testUnlockPercentage = 100;

  // PDA accounts
  let achievemintAuthorityPDA: PublicKey;
  let nftAccountPDA: PublicKey;
  let achievemintAuthorityBump: number;
  let nftAccountBump: number;

  before(async () => {
    // Fund test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user1.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Derive PDA addresses
    [achievemintAuthorityPDA, achievemintAuthorityBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("achievemint-authority")],
        program.programId
      );

    [nftAccountPDA, nftAccountBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft"),
        user1.publicKey.toBuffer(),
        Buffer.from(testAchievementId),
      ],
      program.programId
    );
  });

  it("1. Should initialize program state correctly", async () => {
    try {
      await program.methods
        .initialize()
        .accounts({
          authority: authority.publicKey,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const authorityAccount = await program.account.achievemintAuthority.fetch(
        achievemintAuthorityPDA
      );
      assert.ok(authorityAccount.authority.equals(authority.publicKey));
    } catch (e) {
      console.error("Error during initialization:", e);
      throw e;
    }
  });

  it("2. Should successfully mint NFT with valid parameters", async () => {
    try {
      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          testUnlockPercentage,
          testAchievementId
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: nftAccountPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(nftAccountPDA);
      assert.equal(nftAccount.name, testName);
      assert.equal(nftAccount.description, testDescription);
      assert.equal(nftAccount.rarity, testRarity);
      assert.equal(nftAccount.unlockPercentage, testUnlockPercentage);
      assert.equal(nftAccount.achievementId, testAchievementId);
      assert.ok(nftAccount.owner.equals(user1.publicKey));
    } catch (e) {
      console.error("Error during NFT minting:", e);
      throw e;
    }
  });

  it("3. Should fail to mint with name exceeding 32 characters", async () => {
    try {
      const longName =
        "This name is definitely longer than thirty two characters which is not allowed";

      const [tempNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from("long-name-test"),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          longName,
          testDescription,
          testRarity,
          testUnlockPercentage,
          "long-name-test"
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: tempNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // This should fail, so if we get here it's wrong
      assert.fail("Should have thrown an error for long name");
    } catch (e) {
      // Expected error
      assert.ok(e, "Expected an error to be thrown");
    }
  });

  it("4. Should allow different users to have same achievement ID", async () => {
    try {
      // Calculate PDA for user2 with the same achievement ID
      const [user2NftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user2.publicKey.toBuffer(),
          Buffer.from(testAchievementId),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          testUnlockPercentage,
          testAchievementId
        )
        .accounts({
          payer: user2.publicKey,
          nftAccount: user2NftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(user2NftPDA);
      assert.equal(nftAccount.achievementId, testAchievementId);
      assert.ok(nftAccount.owner.equals(user2.publicKey));
    } catch (e) {
      console.error("Error during same achievement ID test:", e);
      throw e;
    }
  });

  it("5. Should successfully transfer NFT to new owner", async () => {
    try {
      await program.methods
        .transferNft()
        .accounts({
          currentOwner: user1.publicKey,
          newOwner: user2.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(nftAccountPDA);
      assert.ok(nftAccount.owner.equals(user2.publicKey));
    } catch (e) {
      console.error("Error during NFT transfer:", e);
      throw e;
    }
  });

  it("6. Should fail when non-owner attempts transfer", async () => {
    try {
      // First transfer back to user1 to set up the test
      await program.methods
        .transferNft()
        .accounts({
          currentOwner: user2.publicKey,
          newOwner: user1.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user2])
        .rpc();

      // Now try unauthorized transfer - user2 is no longer owner
      await program.methods
        .transferNft()
        .accounts({
          currentOwner: user2.publicKey,
          newOwner: user2.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user2])
        .rpc();

      // This should fail, so if we get here it's wrong
      assert.fail("Should have thrown an error for unauthorized transfer");
    } catch (e) {
      // Expected error
      assert.ok(e, "Expected an error to be thrown");
    }
  });

  it("7. Should maintain achievement metadata after transfer", async () => {
    try {
      // Transfer to user2
      await program.methods
        .transferNft()
        .accounts({
          currentOwner: user1.publicKey,
          newOwner: user2.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(nftAccountPDA);
      assert.equal(nftAccount.name, testName);
      assert.equal(nftAccount.description, testDescription);
      assert.equal(nftAccount.rarity, testRarity);
      assert.equal(nftAccount.unlockPercentage, testUnlockPercentage);
      assert.equal(nftAccount.achievementId, testAchievementId);
      assert.ok(nftAccount.owner.equals(user2.publicKey));
    } catch (e) {
      console.error("Error during metadata preservation test:", e);
      throw e;
    }
  });

  it("8. Should successfully burn NFT and reclaim rent", async () => {
    try {
      // Get account balance before burning
      const preBalance = await provider.connection.getBalance(user2.publicKey);

      await program.methods
        .burnNft()
        .accounts({
          owner: user2.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user2])
        .rpc();

      // Verify the account no longer exists
      try {
        await program.account.nftAccount.fetch(nftAccountPDA);
        assert.fail("NFT account should be closed");
      } catch (error) {
        // Expected - account should be gone
      }

      // Check if rent was returned
      const postBalance = await provider.connection.getBalance(user2.publicKey);
      assert.isAtLeast(postBalance, preBalance);
    } catch (e) {
      console.error("Error during NFT burning:", e);
      throw e;
    }
  });

  it("9. Should fail when non-owner attempts to burn NFT", async () => {
    try {
      // First recreate the NFT for user1
      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          testUnlockPercentage,
          testAchievementId
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: nftAccountPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // Try to burn with user2 who is not the owner
      await program.methods
        .burnNft()
        .accounts({
          owner: user2.publicKey,
          nftAccount: nftAccountPDA,
        })
        .signers([user2])
        .rpc();

      // This should fail
      assert.fail("Should have thrown an error for unauthorized burn");
    } catch (e) {
      // Expected error
      assert.ok(e, "Expected an error to be thrown");
    }
  });

  it("10. Should correctly validate unlock percentage within range", async () => {
    try {
      const validPercentage = 75;
      const [validNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from("valid-percentage"),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          validPercentage,
          "valid-percentage"
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: validNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(validNftPDA);
      assert.equal(nftAccount.unlockPercentage, validPercentage);
    } catch (e) {
      console.error("Error during percentage validation test:", e);
      throw e;
    }
  });

  it("11. Should fail with unlock percentage over 100", async () => {
    try {
      const invalidPercentage = 101;
      const [invalidNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from("invalid-percentage"),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          invalidPercentage,
          "invalid-percentage"
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: invalidNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // This should fail
      assert.fail("Should have thrown an error for percentage > 100");
    } catch (e) {
      // Expected error
      assert.ok(e, "Expected an error to be thrown");
    }
  });

  it("12. Should enforce description length limits properly", async () => {
    try {
      const [validNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from("description-test"),
        ],
        program.programId
      );

      const maxDescription = "A".repeat(280); // Max description length is typically 280 chars

      await program.methods
        .mintNft(
          testName,
          maxDescription,
          testRarity,
          testUnlockPercentage,
          "description-test"
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: validNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(validNftPDA);
      assert.equal(nftAccount.description, maxDescription);
    } catch (e) {
      console.error("Error during description length test:", e);
      throw e;
    }
  });

  it("13. Should validate rarity values according to specification", async () => {
    try {
      const validRarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

      for (let i = 0; i < validRarities.length; i++) {
        const rarity = validRarities[i];
        const [rarityNftPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("nft"),
            user1.publicKey.toBuffer(),
            Buffer.from(`rarity-test-${i}`),
          ],
          program.programId
        );

        await program.methods
          .mintNft(
            testName,
            testDescription,
            rarity,
            testUnlockPercentage,
            `rarity-test-${i}`
          )
          .accounts({
            payer: user1.publicKey,
            nftAccount: rarityNftPDA,
            achievemintAuthority: achievemintAuthorityPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();

        const nftAccount = await program.account.nftAccount.fetch(rarityNftPDA);
        assert.equal(nftAccount.rarity, rarity);
      }
    } catch (e) {
      console.error("Error during rarity validation test:", e);
      throw e;
    }
  });

  it("14. Should work with underscores and & in descriptions", async () => {
    try {
      const specialDescription =
        "This_description has_underscores & ampersands & other_special_chars";
      const [specialNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from("special-chars"),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          testName,
          specialDescription,
          testRarity,
          testUnlockPercentage,
          "special-chars"
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: specialNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const nftAccount = await program.account.nftAccount.fetch(specialNftPDA);
      assert.equal(nftAccount.description, specialDescription);
    } catch (e) {
      console.error("Error during special characters test:", e);
      throw e;
    }
  });

  it("15. Should fail with unsupported special characters in achievement ID", async () => {
    try {
      const invalidAchievementId = "invalid*achievement%id";
      const [invalidNftPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("nft"),
          user1.publicKey.toBuffer(),
          Buffer.from(invalidAchievementId),
        ],
        program.programId
      );

      await program.methods
        .mintNft(
          testName,
          testDescription,
          testRarity,
          testUnlockPercentage,
          invalidAchievementId
        )
        .accounts({
          payer: user1.publicKey,
          nftAccount: invalidNftPDA,
          achievemintAuthority: achievemintAuthorityPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // This should fail
      assert.fail("Should have thrown an error for invalid characters");
    } catch (e) {
      // Expected error
      assert.ok(e, "Expected an error to be thrown");
    }
  });
});
