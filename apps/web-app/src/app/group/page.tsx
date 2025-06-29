"use client"
import Stepper from "@/components/Stepper"
import { useLogContext } from "@/context/LogContext"
import { useSemaphoreContext } from "@/context/SemaphoreContext"
import IconRefreshLine from "@/icons/IconRefreshLine"
import { Box, Button, Divider, Heading, HStack, Link, Text, useBoolean, VStack } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import ZKVote from "../../../contract-artifacts/ZKVote.json"
import { ethers } from "ethers"
import useSemaphoreIdentity from "@/hooks/useSemaphoreIdentity"

export default function GroupsPage() {
    const router = useRouter()
    const { setLog } = useLogContext()
    const { _users, refreshUsers, addUser } = useSemaphoreContext()
    const [_loading, setLoading] = useBoolean()
    const { _identity } = useSemaphoreIdentity()

    useEffect(() => {
        if (_users.length > 0) {
            setLog(`${_users.length} voter${_users.length > 1 ? "s" : ""} retrieved from the voting group 🤙🏽`)
        }
    }, [_users, setLog])

    const users = useMemo(() => [..._users].reverse(), [_users])

    const joinGroup = useCallback(async () => {
        if (!_identity) {
            return
        }

        setLoading.on()
        setLog(`Joining the ZK Vote group...`)

        let joinedGroup: boolean = false

        if (process.env.NEXT_PUBLIC_OPENZEPPELIN_AUTOTASK_WEBHOOK) {
            const response = await fetch(process.env.NEXT_PUBLIC_OPENZEPPELIN_AUTOTASK_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    abi: ZKVote.abi,
                    address: process.env.NEXT_PUBLIC_ZKVOTE_CONTRACT_ADDRESS as string,
                    functionName: "joinGroup",
                    functionParameters: [_identity.commitment.toString()]
                })
            })

            if (response.status === 200) {
                joinedGroup = true
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
                data: iface.encodeFunctionData("joinGroup", [_identity.commitment.toString()]),
                sponsorApiKey: process.env.GELATO_RELAYER_API_KEY
            }
            const response = await fetch(process.env.NEXT_PUBLIC_GELATO_RELAYER_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request)
            })

            if (response.status === 201) {
                joinedGroup = true
            }
        } else {
            const response = await fetch("api/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identityCommitment: _identity.commitment.toString()
                })
            })

            if (response.status === 200) {
                joinedGroup = true
            }
        }

        if (joinedGroup) {
            addUser(_identity.commitment.toString())

            setLog(`You have joined the ZK Vote group! You can now vote anonymously 🎉`)
        } else {
            setLog("Some error occurred, please try again!")
        }

        setLoading.off()
    }, [_identity, addUser, setLoading, setLog])

    const userHasJoined = useMemo(
        () => _identity !== undefined && _users.includes(_identity.commitment.toString()),
        [_identity, _users]
    )

    return (
        <>
            <Heading as="h2" size="xl">
                Voting Group
            </Heading>

            <Text pt="2" fontSize="md">
                <Link href="https://docs.semaphore.pse.dev/guides/groups" isExternal>
                    Semaphore groups
                </Link>{" "}
                are{" "}
                <Link href="https://zkkit.pse.dev/modules/_zk_kit_lean_imt.html" isExternal>
                    Lean incremental Merkle trees
                </Link>{" "}
                in which each leaf contains an identity commitment for a voter. Join this group to participate in anonymous voting.
            </Text>

            <Divider pt="5" borderColor="gray.500" />

            <HStack py="5" justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                    Group voters ({_users.length})
                </Text>
                <Button leftIcon={<IconRefreshLine />} variant="link" color="text.300" onClick={refreshUsers} size="lg">
                    Refresh
                </Button>
            </HStack>

            {_users.length > 0 && (
                <VStack spacing="3" pb="3" align="left" maxHeight="300px" overflowY="scroll">
                    {users.map((user, i) => (
                        <HStack key={i} pb="3" borderBottomWidth={i < _users.length - 1 ? 1 : 0} whiteSpace="nowrap">
                            <Text textOverflow="ellipsis" overflow="hidden">
                                {_identity?.commitment.toString() === user ? <b>{user}</b> : user}
                            </Text>
                        </HStack>
                    ))}
                </VStack>
            )}

            <Box pb="5">
                <Button
                    w="full"
                    colorScheme="primary"
                    isDisabled={_loading || !_identity || userHasJoined}
                    onClick={joinGroup}
                >
                    Join voting group
                </Button>
            </Box>

            <Divider pt="3" borderColor="gray.500" />

            <Stepper
                step={2}
                onPrevClick={() => router.push("/")}
                onNextClick={userHasJoined ? () => router.push("/proofs") : undefined}
            />
        </>
    )
}
