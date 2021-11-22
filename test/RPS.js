const { expect } = require("chai");
//const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const provider = waffle.provider;

describe("Public variables", function () {
  it("Valid values for attributes after deployment", async function () {
    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const bet = 1;
    const reveal = 1000;
    const hardhatRPS = await RPS.deploy(bet, reveal);

    expect(await hardhatRPS.bet()).to.equal(bet);
    expect(await hardhatRPS.revealSpan()).to.equal(reveal);
  });

  it("Valid stages", async function () {
    const [owner] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choice = 1;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(1, 1000);
    expect(await hardhatRPS.stage()).to.equal(0);

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    expect(await hardhatRPS.stage()).to.equal(1);

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    expect(await hardhatRPS.stage()).to.equal(2);

    await hardhatRPS.reveal(choice, revealHash);
    expect(await hardhatRPS.stage()).to.equal(3);

    await hardhatRPS.reveal(choice, revealHash);
    expect(await hardhatRPS.stage()).to.equal(4);

    await hardhatRPS.checkPay();
    expect(await hardhatRPS.stage()).to.equal(0);
  });

  it("Valid revealDeadline", async function () {
    const [owner] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choice = 1;
    const reveal = 1000;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(1, reveal);

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});

    await hardhatRPS.reveal(choice, revealHash);
    const currentBlockNumber = await ethers.provider.getBlockNumber();
    expect(await hardhatRPS.revealDeadline()).to.equal(currentBlockNumber + reveal);
  });

});

describe("Reverts", function () {

  it("Commit reverts", async function () {
    const [owner] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choice = 1;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(1, 1000);

    await expect(hardhatRPS.commit("0x026186018CC97E2A56DCE631217C66BBDDFD58C6AD63F109668C82C6DBE4A775")).to.be.revertedWith("value must be greater than bet");

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await expect(hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")}
        )).to.be.revertedWith("both players have already played");

    await hardhatRPS.reveal(choice, revealHash);
    await expect(hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")}
        )).to.be.revertedWith("both players have already played");

    await hardhatRPS.reveal(choice, revealHash);
    await expect(hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")}
        )).to.be.revertedWith("both players have already played");

    await hardhatRPS.checkPay();
    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
  });

  it("Reveal reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const invalidRevealHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const choice = 1;
    const invalidChoice = 4;
    const wrongChoice = 2;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(1, 1000);

    await expect(hardhatRPS.reveal(choice, revealHash)).to.be.revertedWith("not at reveal stage");

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await expect(hardhatRPS.reveal(choice, revealHash)).to.be.revertedWith("not at reveal stage");

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});

    await expect(hardhatRPS.reveal(invalidChoice, revealHash)).to.be.revertedWith("function was called with incorrect parameters");
    await expect(hardhatRPS.reveal(wrongChoice, revealHash)).to.be.revertedWith("invalid hash");

    await expect(hardhatRPS.reveal(choice, invalidRevealHash)).to.be.revertedWith("invalid hash");

    await expect(hardhatRPS.connect(addr1).reveal(choice, invalidRevealHash)).to.be.revertedWith("unknown player");

    await hardhatRPS.reveal(choice, revealHash);
    await hardhatRPS.reveal(choice, revealHash);
    await expect(hardhatRPS.reveal(choice, revealHash)).to.be.revertedWith("not at reveal stage");

    await hardhatRPS.checkPay();
    await expect(hardhatRPS.reveal(choice, revealHash)).to.be.revertedWith("not at reveal stage");
  });

  it("CheckPay revert", async function () {
    const [owner] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choice = 1;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(1, 1000);

    await expect(hardhatRPS.checkPay()).to.be.revertedWith("cannot yet get winner");

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await expect(hardhatRPS.checkPay()).to.be.revertedWith("cannot yet get winner");

    await hardhatRPS.commit(commitmentHash, {value: ethers.utils.parseEther("1.0")});
    await expect(hardhatRPS.checkPay()).to.be.revertedWith("cannot yet get winner");

    await hardhatRPS.reveal(choice, revealHash);
    await expect(hardhatRPS.checkPay()).to.be.revertedWith("cannot yet get winner");

    await hardhatRPS.reveal(choice, revealHash);

    await hardhatRPS.checkPay();
    await expect(hardhatRPS.checkPay()).to.be.revertedWith("cannot yet get winner");
  });

});

describe("Money", function () {

  it("Retrun difference between bet and value", async function () {
    const [owner] = await ethers.getSigners();
    const commitmentHash = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const bet = 1000000000000000;
    const commitValue = await ethers.utils.parseEther("100.0");

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(bet, 1000);

    const balanceBefore = await provider.getBalance(owner.address);

    await hardhatRPS.commit(commitmentHash, {value: commitValue});

    const balanceAfter = await provider.getBalance(owner.address);

    expect(balanceAfter).to.be.below(balanceBefore.sub(bet));
    expect(balanceAfter).to.be.above(balanceBefore.sub(commitValue));
  });
  
  it("Win scenario", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const commitmentHashOwner = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const commitmentHashAddr1 = "0x42F596D52EDE6012778C2828CB61B5EF541B7D94864E1A68F62090DEA1FFC941";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choiceOwner = 1;
    const choiceAddr1 = 2;
    const bet = 1000000000000000;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(bet, 1000);

    const loserBalanceBefore = await provider.getBalance(owner.address);
    const winnerBalanceBefore = await provider.getBalance(addr1.address);

    await hardhatRPS.commit(commitmentHashOwner, {value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.connect(addr1).commit(commitmentHashAddr1, {value: ethers.utils.parseEther("1.0")});

    await hardhatRPS.reveal(choiceOwner, revealHash);
    await hardhatRPS.connect(addr1).reveal(choiceAddr1, revealHash);

    await hardhatRPS.checkPay();

    const loserBalanceAfter = await provider.getBalance(owner.address);
    const winnerBalanceAfter = await provider.getBalance(addr1.address);

    expect(winnerBalanceAfter).to.be.above(winnerBalanceBefore);
    expect(winnerBalanceAfter).to.be.below(winnerBalanceBefore.add(bet));

    expect(loserBalanceAfter).to.be.below(loserBalanceBefore.sub(bet));
    expect(loserBalanceAfter).to.be.above(loserBalanceBefore.sub(bet).sub(bet));
  });

  it("Draw scenario", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const commitmentHashOwner = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const commitmentHashAddr1 = "0xFCBA4EA3D6A25FA6C2CEDA14D422FB510348CF6B9CB2141C71F5D98E5A8F08F6";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choice = 1;
    const bet = 1000000000000000;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(bet, 1000);

    const ownerBalanceBefore = await provider.getBalance(owner.address);
    const addr1BalanceBefore = await provider.getBalance(addr1.address);

    await hardhatRPS.commit(commitmentHashOwner, {value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.connect(addr1).commit(commitmentHashAddr1, {value: ethers.utils.parseEther("1.0")});

    await hardhatRPS.reveal(choice, revealHash);
    await hardhatRPS.connect(addr1).reveal(choice, revealHash);

    await hardhatRPS.checkPay();

    const ownerBalanceAfter = await provider.getBalance(owner.address);
    const addr1BalanceAfter = await provider.getBalance(addr1.address);

    expect(ownerBalanceAfter).to.be.above(ownerBalanceBefore.sub(bet));
    expect(ownerBalanceAfter).to.be.below(ownerBalanceBefore);

    expect(addr1BalanceAfter).to.be.above(addr1BalanceBefore.sub(bet));
    expect(addr1BalanceAfter).to.be.below(addr1BalanceBefore);
  });

  it("Reveal scenario", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const commitmentHashOwner = "0xC9FE9BBBEF40266D5280A1417F250632897C3CEF2B551AF5018DC1A2D9D43A48";
    const commitmentHashAddr1 = "0x42F596D52EDE6012778C2828CB61B5EF541B7D94864E1A68F62090DEA1FFC941";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choiceOwner = 1;
    const choiceAddr1 = 2;
    const bet = 1000000000000000;
    const reveal = 5;

    const RPS = await ethers.getContractFactory("RockPaperScissors");

    const hardhatRPS = await RPS.deploy(bet, reveal);

    const loserBalanceBefore = await provider.getBalance(owner.address);
    const winnerBalanceBefore = await provider.getBalance(addr1.address);

    await hardhatRPS.commit(commitmentHashOwner, {value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.connect(addr1).commit(commitmentHashAddr1, {value: ethers.utils.parseEther("1.0")});

    await hardhatRPS.connect(addr1).reveal(choiceAddr1, revealHash);

    for (let step = 0; step < reveal; step++) {
      await network.provider.send("evm_mine");
    }

    await hardhatRPS.checkPay();

    const loserBalanceAfter = await provider.getBalance(owner.address);
    const winnerBalanceAfter = await provider.getBalance(addr1.address);

    expect(winnerBalanceAfter).to.be.above(winnerBalanceBefore);
    expect(winnerBalanceAfter).to.be.below(winnerBalanceBefore.add(bet));

    expect(loserBalanceAfter).to.be.below(loserBalanceBefore.sub(bet));
    expect(loserBalanceAfter).to.be.above(loserBalanceBefore.sub(bet).sub(bet));
  });

});

describe("Caller integration tests", function () {
  it("Success calls RockPaperScissors from Caller", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const commitmentHashAddr1 = "0x42F596D52EDE6012778C2828CB61B5EF541B7D94864E1A68F62090DEA1FFC941";
    const revealHash = "0x1717171717171717171717171717171717171717171717171717171717171717";
    const choiceOwner = 1;
    const choiceAddr1 = 2;
    const bet = 1000000000000000;

    const RPS = await ethers.getContractFactory("RockPaperScissors");
    const hardhatRPS = await RPS.deploy(bet, 1000);

    const Caller = await ethers.getContractFactory("Caller");
    const hardhatCaller = await Caller.deploy(hardhatRPS.address, choiceOwner, revealHash);

    const loserBalanceBefore = await provider.getBalance(owner.address);
    const winnerBalanceBefore = await provider.getBalance(addr1.address);

    await hardhatCaller.callCommit({value: ethers.utils.parseEther("1.0")});
    await hardhatRPS.connect(addr1).commit(commitmentHashAddr1, {value: ethers.utils.parseEther("1.0")});

    await hardhatCaller.callReveal();
    await hardhatRPS.connect(addr1).reveal(choiceAddr1, revealHash);

    await hardhatCaller.callCheckPay();

    const loserBalanceAfter = await provider.getBalance(owner.address);
    const winnerBalanceAfter = await provider.getBalance(addr1.address);

    expect(winnerBalanceAfter).to.be.above(winnerBalanceBefore);
    expect(winnerBalanceAfter).to.be.below(winnerBalanceBefore.add(bet));

    expect(loserBalanceAfter).to.be.below(loserBalanceBefore.sub(bet));
    expect(loserBalanceAfter).to.be.above(loserBalanceBefore.sub(bet).sub(bet));
  });
});