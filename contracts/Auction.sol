// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Auction {
    address payable public owner;
    uint public startBlock;
    uint public endBlock;
    string public ipfsHash;

    enum State{
        Started,
        Running,
        Ended,
        Canceled
    }
    State public auctionState;

    uint public highestBindingBid;
    address payable public highestBidder;

    mapping(address => uint) bids;

    uint public bidIncrement;

    // Events
    event BidPlaced(address indexed _from, uint  _value);
    event AuctionCancelled();
    event AuctionFinalized(address winner, uint amount);

    // Custom Errors
    error NotOwner(address caller);

    constructor() {
        owner = payable(msg.sender);
        auctionState = State.Running;
        startBlock = block.number;
        endBlock = startBlock + 40320;
        ipfsHash = "";
        bidIncrement = 100;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    modifier notOwner() {
        require(msg.sender != owner);
        _;
    }

    modifier afterStart() {
        require(block.number >= startBlock);
        _;
    }

    modifier beforeEnd() {
        require(block.number <= endBlock);
        _;
    }

    function min(uint first, uint second) 
        internal
        pure 
        returns (uint) {
        if (first <= second) {
            return first;
        } else {
            return second;
        }
    }

    function placeBid() 
        public 
        payable
        notOwner
        afterStart
        beforeEnd
    {
        require(auctionState == State.Running, "Auction is not in Running State!");
        require(msg.value >= 100, "Not enough Ether sent.");

        uint currentBid = bids[msg.sender] + msg.value;
        require(currentBid > highestBindingBid);

        bids[msg.sender] = currentBid;

        if (currentBid <= bids[highestBidder]) {
            highestBindingBid = min(currentBid + bidIncrement, bids[highestBidder]);
        } else {
            highestBindingBid = min(currentBid, bids[highestBidder] + bidIncrement);
            highestBidder = payable(msg.sender);
        }

        emit BidPlaced(msg.sender, msg.value);
    }

    function cancelAuction() public onlyOwner {
        auctionState = State.Canceled;
        emit AuctionCancelled();
    }

    function finalizeAuction() public {
        require(auctionState == State.Canceled || block.number > endBlock, "State or Block Number Error!");
        require(msg.sender == owner || bids[msg.sender] > 0);

        address payable recipient;
        uint value;

        if (auctionState == State.Canceled) { // auction was cancelled
            recipient = payable(msg.sender);
            value = bids[msg.sender];
        } else { // auction ended not cancelled
            if (msg.sender == owner) { // owner
                recipient = owner;
                value = highestBindingBid;
            } else { // bidder
                if (msg.sender == highestBidder) { // highest bidder
                    recipient = highestBidder;
                    value = bids[highestBidder] - highestBindingBid;
                } else { //neither owner nor highest bidder
                    recipient = payable(msg.sender);
                    value = bids[msg.sender];
                }
            }
        }

        // reseting the bid
        bids[recipient] = 0;
        recipient.transfer(value);
        emit AuctionFinalized(highestBidder, highestBindingBid);
    }
}