import React, { useState, useEffect } from "react";
import {
  BitcoinOTA,
  BitcoinProvider,
  BitcoinNetwork,
} from "@catalogfi/wallets";
import {
  JsonRpcSigner,
  BrowserProvider,
  JsonRpcProvider,
  Wallet,
  ethers 
} from "ethers";
import { BitcoinWallet, EVMWallet } from "@catalogfi/wallets";
import {
  Orderbook,
  Chains,
  Assets,
  Actions,
  parseStatus,
  TESTNET_ORDERBOOK_API,
} from "@gardenfi/orderbook";
import { GardenJS } from "@gardenfi/core";
import UnifiedBridge from "./UnifiedBridge.jsx";


const MetamaskButton = () => {
  const [amount, setAmount] = useState("");


  async function subscribeToOrders() {
    
    const provider = new BitcoinProvider(BitcoinNetwork.Testnet);
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    const ota = new BitcoinOTA(provider, signer);
    console.log(ota);

    const address1 = await ota.getAddress();
    console.log(address1);

    const signer2 = await new BrowserProvider(window.ethereum).getSigner();
    const evmWallet = new EVMWallet(signer);

    const orderbook = await Orderbook.init({
      url: TESTNET_ORDERBOOK_API, // add this line only for testnet
      signer,
    });

    const wallets = {
      [Chains.bitcoin_testnet]: ota,
      [Chains.ethereum_sepolia]: evmWallet,
    };

    const garden = new GardenJS(orderbook, wallets);

    const sendAmount = amount * 1e8;
    console.log(sendAmount);
    const receiveAmount = sendAmount * 0.97;
    console.log(receiveAmount);

    const orderId = await garden.swap(
      Assets.bitcoin_testnet.BTC,
      Assets.ethereum_sepolia.WBTC,
      sendAmount,
      receiveAmount
    );
    const address = await evmWallet.getAddress();

    garden.subscribeOrders(address, async (orders) => {
      const order = orders.find((order) => order.ID === orderId);
      if (!order) return;

      const action = parseStatus(order);
      if (
        action === Actions.UserCanInitiate ||
        action === Actions.UserCanRedeem
      ) {
        const swapper = garden.getSwap(order);
        const swapOutput = await swapper.next();
        console.log(
          `Completed Action ${swapOutput.action} with transaction hash: ${swapOutput.output}`
        );

        if(swapOutput.output===true){
alert(`Swap completed! Transaction hash: ${swapOutput.output}`);

// Open the transaction in Blockscout Sepolia explorer
const explorerUrl = `https://eth-sepolia.blockscout.com/tx/${swapOutput.output}`;
window.open(explorerUrl, "_blank");

        }

         
        if (swapOutput.action === "Redeem") {
          console.log("start");
          setTimeout(async () => {
            const contract = new ethers.Contract(
              "0x528e26b25a34a4a5d0dbda1d57d318153d2ed582",
              UnifiedBridge,
              signer
            );

            const txn = await contract.bridgeAsset(
              1, // [sepolia,polygonzkEVM, Astar]
              "0xAA6C32B4C3B869201A3e162F24bBe37BCacB02D9",
              10000n,
              "0xaD9d14CA82d9BF97fFf745fFC7d48172A1c0969E",
              true,
              "0x"
            );
            console.log("Agglayer bridge txn hash", txn.hash);
          }, 60000);
        }
      }
    });
  }

  return (
    <>
      <h1 className="text-4xl font-bold text-blue-600 text-center py-4">
        Welcome to Your Cross-Chain Wallet
      </h1>
    
      <div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter BTC amount to send"
        />
        <button onClick={subscribeToOrders}>Swap</button>
      </div>
    </>
  );
};

export default MetamaskButton;
