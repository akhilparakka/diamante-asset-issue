const express = require("express");
const diamSdk = require("diamante-sdk-js");
const fs = require("fs");
const cors = require("cors");
const { error } = require("console");

let intermediary_keypair;

const app = express();
app.use(express.json());

app.use(cors());

app.get("/create_issuer", (req, res) => {
  const keypair = diamSdk.Keypair.random();

  const keys_object = {
    public_key: keypair.publicKey(),
    private_key: keypair.secret(),
  };

  const keys = JSON.stringify(keys_object);

  fs.writeFile("keypair.json", keys, "utf8", (err) => {
    if (err) {
      console.log("Error while writing to the file:", err);
    } else {
      console.log("Successfully wrote to the file.");
    }
  });

  res.send({
    issuer: keypair.publicKey(),
  });
});

app.post("/create_asset", (req, res) => {
  const asset_name = req.body.asset_name;

  intermediary_keypair = diamSdk.Keypair.random();

  let keys;
  fs.readFile("keypair.json", "utf8", async (err, data) => {
    if (err) {
      res.send({
        error: "Error reading file",
        data: null,
      });
    } else {
      keys = JSON.parse(data);
      try {
        const server = new diamSdk.Horizon.Server(
          "https://diamtestnet.diamcircle.io"
        );
        const sourceAccount = await server.loadAccount(keys.public_key);
        const sourceKeypair = diamSdk.Keypair.fromSecret(keys.private_key);

        const transaction = new diamSdk.TransactionBuilder(sourceAccount, {
          fee: diamSdk.BASE_FEE,
          networkPassphrase: "Diamante Testnet",
        })
          .addOperation(
            diamSdk.Operation.createAccount({
              destination: intermediary_keypair.publicKey(),
              startingBalance: "3",
            })
          )
          .setTimeout(0)
          .build();

        transaction.sign(sourceKeypair);
        const resp = await server.submitTransaction(transaction);
        if (resp.successful == true) {
          console.log("Succesfull!!");
          res.send({
            error: null,
            data: {
              asset_name: asset_name,
              issuer_address: intermediary_keypair.publicKey(),
            },
          });
        } else {
          res.send({
            error: "Transaction failed",
            data: null,
          });
        }
      } catch (e) {
        res.send({
          error: e,
          data: null,
        });
      }
    }
  });
});

app.post("/mint_asset", async (req, res) => {
  const receiver_addr = req.body.address;
  const asset_name = req.body.asset_name;

  try {
    const server = new diamSdk.Horizon.Server(
      "https://diamtestnet.diamcircle.io"
    );

    const account = await server.loadAccount(intermediary_keypair.publicKey());
    const asset = new diamSdk.Asset(
      asset_name,
      intermediary_keypair.publicKey()
    );

    const transaction = new diamSdk.TransactionBuilder(account, {
      fee: diamSdk.BASE_FEE,
      networkPassphrase: "Diamante Testnet",
    })
      .addOperation(
        diamSdk.Operation.payment({
          destination: receiver_addr,
          asset,
          amount: "1000",
        })
      )
      .addOperation(
        diamSdk.Operation.setOptions({
          masterWeight: 0,
        })
      )
      .setTimeout(100)
      .build();

    transaction.sign(intermediary_keypair);
    const result = await server.submitTransaction(transaction);
    if (result.successful === true) {
      res.send({
        error: null,
        data: "Asset transfered",
      });
    }
  } catch (e) {
    console.log(e);
    res.send({
      error: e,
      data: null,
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
