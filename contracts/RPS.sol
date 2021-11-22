pragma solidity ^0.8.0;

contract RockPaperScissors {
    enum Choice {
        None,
        Rock,
        Paper,
        Scissors
    }

    enum Stage {
        FirstCommit, // First player provide hash of choice
        SecondCommit, // Second player provide hash of choice
        FirstReveal, // One of players approve (reveal) their choice
        SecondReveal, // Another player approve (reveal) their choice
        CheckPay // Check winner and pay double bet
    }

    struct CommitChoice {
        address playerAddress;
        bytes32 commitment; // hash of choice
        Choice choice; // choice after reveal
    }

    event Commit(address player, uint numberOfCommit);
    event Reveal(address player, uint numberOfReveal, Choice choice);
    event Payout(address player, uint amount);

    // Initialisation args
    uint public bet;
    uint public revealSpan; // count of blocks to wait for another player reveal

    // State vars
    CommitChoice[2] public players;
    uint public revealDeadline; // number of deadline block
    Stage public stage = Stage.FirstCommit;

    constructor(uint _bet, uint _revealSpan) public {
        bet = _bet;
        revealSpan = _revealSpan;
    }
    
    modifier commitVerify() {
        // Only run during commit stages
        require(stage == Stage.FirstCommit || stage == Stage.SecondCommit, "both players have already played");
        
        require(msg.value >= bet, "value must be greater than bet");
        // Return additional funds transferred
        if(msg.value > bet) {
            (bool success, ) = msg.sender.call{value: msg.value - bet}("");
            require(success, "call failed");
        }
        _;
    }

    function commit(bytes32 commitmentHash) public payable commitVerify() {
        uint playerIndex;
        if (stage == Stage.FirstCommit) playerIndex = 0;
        else playerIndex = 1;

        // Store the commitment hash
        players[playerIndex] = CommitChoice(msg.sender, commitmentHash, Choice.None);

        // If we're on the first commit, then move to the second
        if(stage == Stage.FirstCommit) {
            stage = Stage.SecondCommit;
            emit Commit(players[0].playerAddress, 1);
        }
        // Otherwise we must already be on the second, move to first reveal
        else {
            stage = Stage.FirstReveal;
            emit Commit(players[1].playerAddress, 2);
        }
    }

    modifier revealVerify(Choice _choice) {
        // Only run during reveal stages
        require(stage == Stage.FirstReveal || stage == Stage.SecondReveal, "not at reveal stage");
        // Only accept valid choices
        require(_choice == Choice.Rock || _choice == Choice.Paper || _choice == Choice.Scissors, "invalid choice");
        // Only known players
        require(msg.sender == players[0].playerAddress || msg.sender == players[1].playerAddress, "unknown player");
        _;
    }
    
    function reveal(Choice choice, bytes32 salt) public revealVerify(choice) {
        // Find the player index
        uint playerIndex;
        if(players[0].playerAddress == msg.sender) playerIndex = 0;
        else playerIndex = 1;

        // Find player data
        CommitChoice storage commitChoice = players[playerIndex];

        // Check the hash to ensure the commitment is correct
        require(keccak256(abi.encodePacked(msg.sender, choice, salt)) == commitChoice.commitment, "invalid hash");

        // Update choice if hash (commitment) is correct
        commitChoice.choice = choice;

        if(stage == Stage.FirstReveal) {
            // If this is the first reveal, set the deadline for the second one
            revealDeadline = block.number + revealSpan;
            require(revealDeadline >= block.number, "overflow error");
            // Move to second reveal
            stage = Stage.SecondReveal;
            emit Reveal(players[0].playerAddress, 1, choice);
        }
        // If we're on second reveal, move to distribute stage
        else {
            stage = Stage.CheckPay;
            emit Reveal(players[1].playerAddress, 2, choice);
        }
    }

    modifier checkPayVerify() {
        // To distribute we need:
            // a) To be in the distribute stage OR
            // b) Still in the second reveal stage but past the deadline
        require(stage == Stage.CheckPay || (stage == Stage.SecondReveal && revealDeadline <= block.number), "cannot yet get winner");
        
        require(2*bet >= bet, "overflow error");
        _;
    }
    
    function checkPay() public checkPayVerify() {
        // Calculate value of payouts for players
        uint player0Payout;
        uint player1Payout;
        uint winningAmount = 2 * bet;

        // If both players picked the same choice, return their bets
        if(players[0].choice == players[1].choice) {
            player0Payout = bet;
            player1Payout = bet;
        }
        
        // If only one player made a choice after deadline, they win
        else if(players[0].choice == Choice.None) {
            player1Payout = winningAmount;
        }
        else if(players[1].choice == Choice.None) {
            player0Payout = winningAmount;
        }
        // Case of first player's rock
        else if(players[0].choice == Choice.Rock) {
            assert(players[1].choice == Choice.Paper || players[1].choice == Choice.Scissors);
            if(players[1].choice == Choice.Paper) {
                // Rock loses to paper
                player1Payout = winningAmount;
            }
            else if(players[1].choice == Choice.Scissors) {
                // Rock beats scissors
                player0Payout = winningAmount;
            }

        }
        // Case of first player's paper
        else if(players[0].choice == Choice.Paper) {
            assert(players[1].choice == Choice.Rock || players[1].choice == Choice.Scissors);
            if(players[1].choice == Choice.Rock) {
                // Paper beats rock
                player0Payout = winningAmount;
            }
            else if(players[1].choice == Choice.Scissors) {
                // Paper loses to scissors
                player1Payout = winningAmount;
            }
        }
        // Case of first player's scissors
        else if(players[0].choice == Choice.Scissors) {
            assert(players[1].choice == Choice.Paper || players[1].choice == Choice.Rock);
            if(players[1].choice == Choice.Rock) {
                // Scissors lose to rock
                player1Payout = winningAmount;
            }
            else if(players[1].choice == Choice.Paper) {
                // Scissors beats paper
                player0Payout = winningAmount;
            }
        }

        // Send the payout to winner only (he get everything)
        if(player0Payout > 0) {
            (bool success, ) = players[0].playerAddress.call{value: player0Payout}("");
            require(success, 'call failed');
            emit Payout(players[0].playerAddress, player0Payout);
        }
        if (player1Payout > 0) {
            (bool success, ) = players[1].playerAddress.call{value: player1Payout}("");
            require(success, 'call failed');
            emit Payout(players[1].playerAddress, player1Payout);
        }

        // Reset the state to play again
        delete players;
        revealDeadline = 0;
        stage = Stage.FirstCommit;
    }
}