import { ethers } from "ethers";
import "dotenv/config";

// TODO: replace with the real ERC-8004 ABI fragments once confirmed with GOAT devrel.
const IDENTITY_REGISTRY_ABI = [
  "function isRegistered(address agent) view returns (bool)",
  "function getAgentId(address agent) view returns (string)",
];
const REPUTATION_REGISTRY_ABI = [
  "function getReputationScore(string agentId) view returns (uint256)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(process.env.EVM_RPC_URL);
}

export async function verifyAgentTrust(agentAddress: string) {
  const provider = getProvider();

  const identity = new ethers.Contract(
    process.env.ERC8004_IDENTITY_REGISTRY_ADDR!,
    IDENTITY_REGISTRY_ABI,
    provider
  );
  const reputation = new ethers.Contract(
    process.env.ERC8004_REPUTATION_REGISTRY_ADDR!,
    REPUTATION_REGISTRY_ABI,
    provider
  );

  const isRegistered: boolean = await identity.isRegistered(agentAddress);
  if (!isRegistered) {
    return { agentAddress, registered: false, reputationScore: null, trustLevel: "unverified" };
  }

  const agentId: string = await identity.getAgentId(agentAddress);
  const score: bigint = await reputation.getReputationScore(agentId);
  const scoreNum = Number(score);

  const trustLevel = scoreNum >= 80 ? "high" : scoreNum >= 40 ? "moderate" : "low";

  return { agentAddress, agentId, registered: true, reputationScore: scoreNum, trustLevel };
}
