const { expect } = require('chai')
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')

describe('auction contract', () => {
  const BID_INCREMENT = '100'
  const deployAuction = async () => {
    const [owner, bidder1, bidder2] = await ethers.getSigners()

    const Auction = await ethers.getContractFactory('Auction')
    const hardhatAuction = await Auction.deploy()

    return { owner, bidder1, bidder2, hardhatAuction }
  }

  it('should validate the owner address', async () => {
    const { owner, hardhatAuction } = await loadFixture(deployAuction)
    expect(await hardhatAuction.owner()).to.equal(owner.address)
  })

  it('should check the bidIncrement value', async () => {
    const { hardhatAuction } = await loadFixture(deployAuction)
    expect(await hardhatAuction.bidIncrement()).to.equal(BID_INCREMENT)
  })

  it('should check that the owner can not bid', async () => {
    const { hardhatAuction } = await loadFixture(deployAuction)
    await expect(hardhatAuction.placeBid()).to.be.reverted
  })

  it('should revert tx when not enough ether send along the tx', async () => {
    const { bidder1, hardhatAuction } = await loadFixture(deployAuction)
    await expect(hardhatAuction.connect(bidder1).placeBid()).to.be.revertedWith(
      'Not enough Ether sent.',
    )
  })
})
