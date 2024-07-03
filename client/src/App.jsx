import { useState } from "react";
import "./App.css";

import {
  Keypair,
  Horizon,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
} from "diamante-sdk-js";

function App() {
  const [issuer, setIssuer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [myAddress, setMyAddress] = useState("");
  const [assetName, setAssetName] = useState("");
  const [asset, setAsset] = useState("");

  const handleMakeIssuer = async () => {
    try {
      let headersList = {
        Accept: "*/*",
      };

      let response = await fetch("http://localhost:3000/create_issuer", {
        method: "GET",
        headers: headersList,
      });

      let data = await response.json();
      setIssuer(data.issuer);
    } catch (e) {
      console.log(e);
    }
  };

  const handleFundIssuer = async () => {
    const ext_resp = await window.diam.connect();
    if (ext_resp.status === 200) {
      setMyAddress(ext_resp.message[0]);

      const server = new Horizon.Server("https://diamtestnet.diamcircle.io");
      const sourceAccount = await server.loadAccount(ext_resp.message[0]);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: "Diamante Testnet",
      })
        .addOperation(
          Operation.createAccount({
            destination: issuer,
            startingBalance: "10",
          })
        )
        .setTimeout(0)
        .build();

      const xdr = transaction.toXDR("base64");

      const resp = await window.diam.sign(xdr, true, "Diamante Testnet");
      if (resp.response.status === 200) {
        alert("Issuer account active");
      } else {
        alert("Something went wrong!");
      }

      console.log(resp, "Checkkkkk");
    } else {
      alert("Error");
    }
  };

  const handleNamebtnClick = async () => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let bodyContent = JSON.stringify({
      asset_name: assetName,
    });

    let response = await fetch("http://localhost:3000/create_asset", {
      method: "POST",
      body: bodyContent,
      headers: headersList,
    });

    let data = await response.json();
    if (response.status === 200) {
      setAsset(data.data.asset_name);
      const server = new Horizon.Server("https://diamtestnet.diamcircle.io");

      const asset = new Asset(data.data.asset_name, data.data.issuer_address);

      const receiverAddress = await server.loadAccount(myAddress);

      const transaction = new TransactionBuilder(receiverAddress, {
        fee: BASE_FEE,
        networkPassphrase: "Diamante Testnet",
      })
        .addOperation(Operation.changeTrust({ asset }))
        .setTimeout(0)
        .build();

      const xdr = transaction.toXDR("base64");
      const resp = await window.diam.sign(xdr, true, "Diamante Testnet");
      if (resp.response.status === 200) {
        alert("Trustline created for asset ", data.data.asset_name);
      }
    }
  };

  const handleTransferAsset = async () => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let bodyContent = JSON.stringify({
      address: myAddress,
      asset_name: asset,
    });

    let response = await fetch("http://localhost:3000/mint_asset", {
      method: "POST",
      body: bodyContent,
      headers: headersList,
    });

    let data = await response.text();
    console.log(data, "YAAAAAAAAAAAAAAAAAA");
  };

  return (
    <>
      <button onClick={handleMakeIssuer}>Make Issuer</button>
      {issuer && <div>Issuer is {issuer}</div>}

      <button onClick={handleFundIssuer}>Fund Issuer</button>

      <form>
        <input
          type="text"
          value={assetName}
          onChange={(e) => {
            setAssetName(e.target.value);
          }}
        />
        <button type="button" onClick={handleNamebtnClick}>
          Issue Asset
        </button>
      </form>

      <button type="button" onClick={handleTransferAsset}>
        Transfer asset
      </button>
    </>
  );
}

export default App;
