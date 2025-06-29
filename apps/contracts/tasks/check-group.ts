import { task } from "hardhat/config"

task("check-group", "Check ZKVote contract group status")
    .addParam("contract", "ZKVote contract address")
    .setAction(async ({ contract: contractAddress }, { ethers }) => {
        const ZKVoteFactory = await ethers.getContractFactory("ZKVote")
        const zkvoteContract = ZKVoteFactory.attach(contractAddress)

        console.log("Checking ZKVote contract group status...")
        
        try {
            const groupId = await zkvoteContract.groupId()
            console.log(`✓ Group ID: ${groupId}`)
            
            // Semaphore 컨트랙트 주소 확인
            const semaphoreAddress = await zkvoteContract.semaphore()
            console.log(`✓ Semaphore contract: ${semaphoreAddress}`)
            
            // 투표 옵션들 확인
            const voteOptions = await zkvoteContract.getVoteOptions()
            console.log(`✓ Vote options count: ${voteOptions.length}`)
            voteOptions.forEach((option: string, index: number) => {
                console.log(`  ${index}: ${option}`)
            })
            
            // 투표 활성화 상태 확인
            const votingActive = await zkvoteContract.votingActive()
            console.log(`✓ Voting active: ${votingActive}`)
            
        } catch (error) {
            console.error("✗ Error checking group status:", error)
        }
    }) 