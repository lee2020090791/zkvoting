import { task, types } from "hardhat/config"

task("deploy", "Deploy a ZKVote contract")
    .addOptionalParam("semaphore", "Semaphore contract address", undefined, types.string)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs, semaphore: semaphoreAddress }, { ethers, run }) => {
        if (!semaphoreAddress) {
            const { semaphore } = await run("deploy:semaphore", {
                logs
            })

            semaphoreAddress = await semaphore.getAddress()
        }

        const ZKVoteFactory = await ethers.getContractFactory("ZKVote")

        const zkvoteContract = await ZKVoteFactory.deploy(semaphoreAddress)

        await zkvoteContract.waitForDeployment()

        const groupId = await zkvoteContract.groupId()

        if (logs) {
            console.info(
                `ZKVote contract has been deployed to: ${await zkvoteContract.getAddress()} (groupId: ${groupId})`
            )
        }

        return zkvoteContract
    })
