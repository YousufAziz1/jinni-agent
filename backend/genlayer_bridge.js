/**
 * GenLayer Bridge CLI for JINNI Agent Backend
 * Provides Node.js bindings to the official genlayer-js SDK for Studionet interactions.
 */

const path = require('path');
const { createClient, chains, createAccount, generatePrivateKey } = require(path.resolve(__dirname, '../frontend/node_modules/genlayer-js'));

const CONTRACT_ADDRESS = process.env.JINNI_AGENT_CONTRACT_ADDRESS || '0xa54cF1bBCfe4456b6194658699aab540fBeF046c';

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];

  const client = createClient({ chain: chains.studionet });

  try {
    switch (command) {
      case 'read_decision': {
        const proposalId = arg1;
        const result = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_decision',
          args: [proposalId]
        });
        console.log(typeof result === 'string' ? result : JSON.stringify(result));
        break;
      }

      case 'read_proposal_count': {
        const count = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_proposal_count',
          args: []
        });
        console.log(count.toString());
        break;
      }

      case 'read_proposal': {
        const proposalId = arg1;
        const result = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_proposal',
          args: [proposalId]
        });
        console.log(typeof result === 'string' ? result : JSON.stringify(result));
        break;
      }

      case 'submit_proposal': {
        const proposalJson = arg1;
        const pk = generatePrivateKey();
        const account = createAccount(pk);
        const writeClient = createClient({
          chain: chains.studionet,
          account
        });
        const txHash = await writeClient.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'adjudicate_proposal',
          args: [proposalJson],
          gas: 1000000n
        });
        console.log(JSON.stringify({ txHash }));
        break;
      }

      case 'get_receipt': {
        const txHash = arg1;
        const receipt = await client.getTransactionReceipt({ hash: txHash });
        console.log(JSON.stringify(receipt, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        break;
      }

      case 'get_transaction': {
        const txHash = arg1;
        const tx = await client.getTransaction({ hash: txHash });
        console.log(JSON.stringify(tx, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        break;
      }

      default:
        console.error(JSON.stringify({ error: `Unknown command: ${command}` }));
        process.exit(1);
    }
  } catch (error) {
    console.error(JSON.stringify({ error: error.message || String(error) }));
    process.exit(1);
  }
}

main();
