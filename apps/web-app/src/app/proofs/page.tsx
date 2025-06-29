"use client"

import Stepper from "@/components/Stepper"
import { useLogContext } from "@/context/LogContext"
import { useSemaphoreContext } from "@/context/SemaphoreContext"
import IconRefreshLine from "@/icons/IconRefreshLine"
import { Box, Button, Divider, Heading, HStack, Link, Text, useBoolean, VStack, Select } from "@chakra-ui/react"
import { generateProof, Group } from "@semaphore-protocol/core"
import { ethers } from "ethers"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import ZKVote from "../../../contract-artifacts/ZKVote.json"
import useSemaphoreIdentity from "@/hooks/useSemaphoreIdentity"

export default function ProofsPage() {
    const router = useRouter()
    const { setLog } = useLogContext()
    const { _users, _feedback, refreshFeedback, addFeedback } = useSemaphoreContext()
    const [_loading, setLoading] = useBoolean()
    const { _identity } = useSemaphoreIdentity()
    const [selectedVote, setSelectedVote] = useState<string>("")

    // 투표 옵션들 (나중에 컨트랙트에서 가져올 수 있음)
    const voteOptions = ["Option A", "Option B", "Option C", "Option D"]

    useEffect(() => {
        if (_feedback.length > 0) {
            setLog(`${_feedback.length} vote${_feedback.length > 1 ? "s" : ""} retrieved from the group 🤙🏽`)
        }
    }, [_feedback, setLog])

    const feedback = useMemo(() => [..._feedback].reverse(), [_feedback])

    const castVote = useCallback(async () => {
        if (!_identity || !selectedVote) {
            return
        }

        setLoading.on()

        setLog(`Casting your anonymous vote...`)

        try {
            const group = new Group(_users)

            // 투표 옵션의 인덱스를 찾음
            const voteIndex = voteOptions.indexOf(selectedVote)
            const message = ethers.toBigInt(voteIndex)

            const { points, merkleTreeDepth, merkleTreeRoot, nullifier } = await generateProof(
                _identity,
                group,
                message,
                process.env.NEXT_PUBLIC_GROUP_ID as string
            )

            let voteSent: boolean = false
            const params = [merkleTreeDepth, merkleTreeRoot, nullifier, message, points]
            
            if (process.env.NEXT_PUBLIC_OPENZEPPELIN_AUTOTASK_WEBHOOK) {
                const response = await fetch(process.env.NEXT_PUBLIC_OPENZEPPELIN_AUTOTASK_WEBHOOK, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        abi: ZKVote.abi,
                        address: process.env.NEXT_PUBLIC_ZKVOTE_CONTRACT_ADDRESS,
                        functionName: "castVote",
                        functionParameters: params
                    })
                })

                if (response.status === 200) {
                    voteSent = true
                }
            } else if (
                process.env.NEXT_PUBLIC_GELATO_RELAYER_ENDPOINT &&
                process.env.NEXT_PUBLIC_GELATO_RELAYER_CHAIN_ID &&
                process.env.GELATO_RELAYER_API_KEY
            ) {
                const iface = new ethers.Interface(ZKVote.abi)
                const request = {
                    chainId: process.env.NEXT_PUBLIC_GELATO_RELAYER_CHAIN_ID,
                    target: process.env.NEXT_PUBLIC_ZKVOTE_CONTRACT_ADDRESS,
                    data: iface.encodeFunctionData("castVote", params),
                    sponsorApiKey: process.env.GELATO_RELAYER_API_KEY
                }
                const response = await fetch(process.env.NEXT_PUBLIC_GELATO_RELAYER_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(request)
                })

                if (response.status === 201) {
                    voteSent = true
                }
            } else {
                const response = await fetch("api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        feedback: selectedVote,
                        merkleTreeDepth,
                        merkleTreeRoot,
                        nullifier,
                        points
                    })
                })

                if (response.status === 200) {
                    voteSent = true
                }
            }

            if (voteSent) {
                addFeedback(selectedVote)

                setLog(`Your vote for "${selectedVote}" has been cast anonymously 🎉`)
                setSelectedVote("")
            } else {
                setLog("Some error occurred, please try again!")
            }
        } catch (error) {
            console.error(error)

            setLog("Some error occurred, please try again!")
        } finally {
            setLoading.off()
        }
    }, [_identity, _users, addFeedback, setLoading, setLog, selectedVote, voteOptions])

    return (
        <>
            <Heading as="h2" size="xl">
                Cast Your Vote
            </Heading>

            <Text pt="2" fontSize="md">
                Semaphore members can anonymously{" "}
                <Link href="https://docs.semaphore.pse.dev/guides/proofs" isExternal>
                    prove
                </Link>{" "}
                that they are part of a group and cast their anonymous votes. Your vote will be recorded without revealing your identity.
            </Text>

            <Divider pt="5" borderColor="gray.500" />

            <HStack py="5" justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                    Votes ({_feedback.length})
                </Text>
                <Button
                    leftIcon={<IconRefreshLine />}
                    variant="link"
                    color="text.300"
                    onClick={refreshFeedback}
                    size="lg"
                >
                    Refresh
                </Button>
            </HStack>

            {_feedback.length > 0 && (
                <VStack spacing="3" pb="3" align="left" maxHeight="300px" overflowY="scroll">
                    {feedback.map((f, i) => (
                        <HStack key={i} pb="3" borderBottomWidth={i < _feedback.length - 1 ? 1 : 0}>
                            <Text>Vote: {f}</Text>
                        </HStack>
                    ))}
                </VStack>
            )}

            <Box pb="5">
                <Select
                    placeholder="Select your vote"
                    value={selectedVote}
                    onChange={(e) => setSelectedVote(e.target.value)}
                    mb="4"
                >
                    {voteOptions.map((option, index) => (
                        <option key={index} value={option}>
                            {option}
                        </option>
                    ))}
                </Select>
                <Button 
                    w="full" 
                    colorScheme="primary" 
                    isDisabled={_loading || !selectedVote} 
                    onClick={castVote}
                >
                    Cast Vote
                </Button>
            </Box>

            <Divider pt="3" borderColor="gray" />

            <Stepper step={3} onPrevClick={() => router.push("/group")} />
        </>
    )
}
