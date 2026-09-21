import { ethers } from "ethers";
import "dotenv/config";

const IDENTITY_ABI = [
  "function register() external returns (uint256)",
  "function register(string agentURI) external returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
  const registry = new ethers.Contract(
    process.env.ERC8004_IDENTITY_REGISTRY_ADDR!,
    IDENTITY_ABI,
    wallet
  );

  console.log("Registering agent from wallet:", wallet.address);

  const tx = await registry["register()"]();
  console.log("Submitted tx:", tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);

  const transferEvent = receipt?.logs
    .map((log: any) => {
      try {
        return registry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: any) => parsed?.name === "Transfer");

  if (transferEvent) {
    console.log("Registered! Your agentId is:", transferEvent.args.tokenId.toString());
  } else {
    console.log("Registered, but couldn't parse agentId from logs — check the tx on the explorer.");
  }
}

main().catch((err) => {
  console.error("Registration failed:", err);
  process.exit(1);
});