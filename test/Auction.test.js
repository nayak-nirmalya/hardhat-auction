const { expect } = require('chai')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

const BID_INCREMENT = '100'
const BLOCKS_TO_BE_MINED = 40320

const AUCTION_STATE = {
  Started: 0,
  Running: 1,
  Ended: 2,
  Canceled: 3,
}

const mineNBlocks = async (numberOfBlocks) => {
  for (let index = 0; index < numberOfBlocks; index++) {
    await ethers.provider.send('evm_mine')
  }
}

describe('auction contract', () => {
  const deployAuction = async () => {
    const [owner, bidder1, bidder2] = await ethers.getSigners()

    const Auction = await ethers.getContractFactory('Auction')
    const hardhatAuction = await Auction.deploy()

    return { owner, bidder1, bidder2, hardhatAuction }
  }

  describe('initial validation', () => {
    it('should validate the owner address', async () => {
      const { owner, hardhatAuction } = await loadFixture(deployAuction)
      expect(await hardhatAuction.owner()).to.equal(owner.address)
    })

    it('should check the bidIncrement value', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      expect(await hardhatAuction.bidIncrement()).to.equal(BID_INCREMENT)
    })
  })

  describe('placing bid auction', () => {
    it('should validate auctionState as "Running"', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      expect(await hardhatAuction.auctionState()).to.equal(
        AUCTION_STATE.Running,
      )
    })

    it('should check that the owner can not bid', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      await expect(hardhatAuction.placeBid()).to.be.reverted
    })

    it('should revert tx when not enough ether send along the tx', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      await expect(
        hardhatAuction.connect(bidder1).placeBid(),
      ).to.be.revertedWith('Not enough Ether sent.')
    })

    it('should place bid and emit an event "BidPlaced" for bidder2', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      const valueInWei = 150
      await expect(
        hardhatAuction.connect(bidder1).placeBid({ value: valueInWei }),
      )
        .to.emit(hardhatAuction, 'BidPlaced')
        .withArgs(bidder1.address, valueInWei)
    })

    it('should place bid and emit an event "BidPlaced" for bidder2', async () => {
      const { bidder2, hardhatAuction } = await loadFixture(deployAuction)
      const valueInWei = 450
      await expect(
        hardhatAuction.connect(bidder2).placeBid({ value: valueInWei }),
      )
        .to.emit(hardhatAuction, 'BidPlaced')
        .withArgs(bidder2.address, valueInWei)
    })
  })

  describe('canceling auction', () => {
    it('no one except owner can cancel the auction', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      await expect(hardhatAuction.connect(bidder1).cancelAuction())
        .to.be.revertedWithCustomError(hardhatAuction, 'NotOwner')
        .withArgs(bidder1.address)
    })

    it('should emit "AuctionCancelled" event', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      await expect(hardhatAuction.cancelAuction()).to.emit(
        hardhatAuction,
        'AuctionCancelled',
      )
    })
  })

  describe('finalizing auction', () => {
    it('should revert with "State or Block Number Error!"', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      await expect(hardhatAuction.finalizeAuction()).to.be.revertedWith(
        'State or Block Number Error!',
      )
    })

    it('should emit an event "AuctionFinalized"', async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      const highestBidder = await hardhatAuction.highestBidder()
      const highestBindingBid = await hardhatAuction.highestBindingBid()

      // simulate mining blocks
      await mineNBlocks(BLOCKS_TO_BE_MINED)

      await expect(hardhatAuction.finalizeAuction())
        .to.emit(hardhatAuction, 'AuctionFinalized')
        .withArgs(highestBidder, highestBindingBid)
    })

    it("assert change in highest bidder's balance", async () => {
      const { hardhatAuction } = await loadFixture(deployAuction)
      const highestBidder = await hardhatAuction.highestBidder()
      const highestBindingBid = await hardhatAuction.highestBindingBid()

      // simulate mining blocks
      await mineNBlocks(BLOCKS_TO_BE_MINED)

      await expect(hardhatAuction.finalizeAuction()).to.changeEtherBalance(
        highestBidder,
        -highestBindingBid,
        {
          includeFee: true,
        },
      )
    })
  })
})
