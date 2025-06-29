//SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISemaphore {
    struct SemaphoreProof {
        uint256 merkleTreeDepth;
        uint256 merkleTreeRoot;
        uint256 nullifier;
        uint256 message;
        uint256 scope;
        uint256[8] points;
    }

    function createGroup(address admin, uint256 merkleTreeDuration) external returns (uint256);
    function addMember(uint256 groupId, uint256 identityCommitment) external;
    function validateProof(uint256 groupId, SemaphoreProof calldata proof) external view;
}

contract ZKVote {
    ISemaphore public semaphore;

    uint256 public groupId;
    
    // 투표 옵션들을 저장
    string[] public voteOptions;
    
    // 각 옵션별 투표 수를 저장
    mapping(uint256 => uint256) public voteCounts;
    
    // 투표가 활성화되어 있는지 확인
    bool public votingActive;

    constructor(address semaphoreAddress) {
        semaphore = ISemaphore(semaphoreAddress);
        groupId = semaphore.createGroup(address(this), 3600); // 1시간 duration
        votingActive = true;
    }

    function joinGroup(uint256 identityCommitment) external {
        semaphore.addMember(groupId, identityCommitment);
    }

    function addVoteOption(string memory option) external {
        voteOptions.push(option);
    }

    function castVote(
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 voteOption,
        uint256[8] calldata points
    ) external {
        require(votingActive, "Voting is not active");
        require(voteOption < voteOptions.length, "Invalid vote option");
        
        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof(
            merkleTreeDepth,
            merkleTreeRoot,
            nullifier,
            voteOption,
            groupId,
            points
        );

        semaphore.validateProof(groupId, proof);
        
        // 투표 수 증가
        voteCounts[voteOption]++;
    }
    
    function getVoteOptions() external view returns (string[] memory) {
        return voteOptions;
    }
    
    function getVoteCount(uint256 optionIndex) external view returns (uint256) {
        return voteCounts[optionIndex];
    }
    
    function setVotingActive(bool active) external {
        votingActive = active;
    }
} 