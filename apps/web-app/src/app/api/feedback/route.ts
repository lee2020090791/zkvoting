import { Contract, InfuraProvider, JsonRpcProvider, Wallet } from "ethers"
import { NextRequest } from "next/server"
import ZKVote from "../../../../contract-artifacts/ZKVote.json"

export async function POST(req: NextRequest) {
    if (typeof process.env.ETHEREUM_PRIVATE_KEY !== "string") {
        throw new Error("Please, define ETHEREUM_PRIVATE_KEY in your .env file")
    }

    const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY
    const ethereumNetwork = process.env.NEXT_PUBLIC_DEFAULT_NETWORK as string
    const infuraApiKey = process.env.NEXT_PUBLIC_INFURA_API_KEY as string
    const contractAddress = process.env.NEXT_PUBLIC_ZKVOTE_CONTRACT_ADDRESS as string

    const provider =
        ethereumNetwork === "localhost"
            ? new JsonRpcProvider("http://127.0.0.1:8545")
            : new InfuraProvider(ethereumNetwork, infuraApiKey)

    const signer = new Wallet(ethereumPrivateKey, provider)
    const contract = new Contract(contractAddress, ZKVote.abi, signer)

    const { feedback, merkleTreeDepth, merkleTreeRoot, nullifier, points } = await req.json()

    try {
        // 투표 옵션 인덱스 계산
        const voteOptions = ["Option A", "Option B", "Option C", "Option D"]
        const voteOption = voteOptions.indexOf(feedback)
        
        if (voteOption === -1) {
            throw new Error("Invalid vote option")
        }

        const transaction = await contract.castVote(merkleTreeDepth, merkleTreeRoot, nullifier, voteOption, points)

        await transaction.wait()

        return new Response("Success", { status: 200 })
    } catch (error: any) {
        console.error(error)

        return new Response(`Server error: ${error}`, {
            status: 500
        })
    }
}
