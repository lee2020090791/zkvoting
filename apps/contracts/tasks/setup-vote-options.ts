import { task } from "hardhat/config"

task("setup-vote-options", "Add vote options to ZKVote contract")
    .addParam("contract", "ZKVote contract address")
    .setAction(async ({ contract: contractAddress }, { ethers }) => {
        const ZKVoteFactory = await ethers.getContractFactory("ZKVote")
        const zkvoteContract = ZKVoteFactory.attach(contractAddress)

        const voteOptions = ["Option A", "Option B", "Option C", "Option D"]

        console.log("Adding vote options to ZKVote contract...")

        for (const option of voteOptions) {
            try {
                const tx = await zkvoteContract.addVoteOption(option)
                await tx.wait()
                console.log(`✓ Added vote option: ${option}`)
            } catch (error) {
                console.error(`✗ Failed to add vote option: ${option}`, error)
            }
        }

        console.log("Vote options setup completed!")
    }) 