pragma solidity ^0.8.0;

import "./RPS.sol";

contract Caller {
    
    address owner;
    address rpsContract;
    uint8   choice;
    bytes32 salt;
    bytes32 commitmentHash;

    constructor(address _rpsContract, uint8 _choice, bytes32 _salt) public {
        require(_rpsContract != address(0), "empty RockPaperScissors address");
        require(_choice >= 1 && _choice <= 3, "invalid choice");
        
        owner = msg.sender;        
        rpsContract = _rpsContract;
        choice = _choice;
        salt = _salt;
        commitmentHash = keccak256(abi.encodePacked(address(this), choice, salt));
    }

    function callCommit() public payable {
        (bool success, ) = rpsContract.call{value: msg.value, gas: 500000}(abi.encodeWithSignature("commit(bytes32)", commitmentHash));
        require(success == true, "not success commit");
    }

    function callReveal() public {
        (bool success, ) = rpsContract.call(abi.encodeWithSignature("reveal(uint8,bytes32)", choice, salt));
        require(success == true, "not success reveal");
    }

    function callCheckPay() public {
        (bool success, ) = rpsContract.call(abi.encodeWithSignature("checkPay()"));
        require(success == true, "not success checkPay");
    }

    receive() external payable {
        (bool success, ) = owner.call{value: msg.value}("");
        require(success, "receive call failed");
    }
}