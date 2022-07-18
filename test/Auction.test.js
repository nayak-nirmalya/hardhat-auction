const { expect } = require('chai')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

const BID_INCREMENT = '100'
const AUCTION_STATE = {
  Started: 0,
  Running: 1,
  Ended: 2,
  Canceled: 3,
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

    it('should place bid and emit an event "BidPlaced"', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      const valueInWei = 150
      await expect(
        hardhatAuction.connect(bidder1).placeBid({ value: valueInWei }),
      )
        .to.emit(hardhatAuction, 'BidPlaced')
        .withArgs(bidder1.address, valueInWei)
    })
  })

  describe('cancelling auction', () => {
    it('no one except owner can cancell the auction', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      await expect(
        hardhatAuction.connect(bidder1).cancelAuction(),
      ).to.be.revertedWith('Not Owner!')
    })

    it('should emit "AuctionCancelled" event', async () => {
      const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
      await expect(hardhatAuction.cancelAuction()).to.emit(
        hardhatAuction,
        'AuctionCancelled',
      )
    })
  })
})
