const express = require("express");
const axios = require("axios");
const uniqid = require("uniqid");
const sha256 = require("sha256");
const port = 4000;
const app = express();

const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;

app.get("/", (req, res) => {
  res.send("Phone Pay App is Working");
});

app.get("/pay", (req, res) => {
  const payEndpoint = "/pg/v1/pay";
  const merchantTransactionId = uniqid();
  const userId = 123;
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: 3000,
    redirectUrl: `https://localhost:4000/redirect-url/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
  const base63EncodedPayload = bufferObj.toString("base64");

  const xVerify =
    sha256(base63EncodedPayload + payEndpoint + SALT_KEY) + "###" + SALT_INDEX;

  const options = {
    method: "post",
    url: `${PHONE_PE_HOST_URL}${payEndpoint}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    data: {
      request: base63EncodedPayload,
    },
  };
  axios
    .request(options)
    .then(function (response) {
      console.log(response.data);
      const url = response.data.data.instrumentResponse.redirectInfo.url;
      res.redirect(url);
    })
    .catch(function (error) {
      console.error(error);
    });
});

app.get("/redirect-url/:merchantTransactionId", (req, res) => {
  const { merchantTransactionId } = req.params;
  console.log("MTId", merchantTransactionId);
  if (merchantTransactionId) {
    const xVerify =
      sha256(
        `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY
      ) +
      "###" +
      SALT_INDEX;
    const options = {
      method: "get",
      url: `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-MERCHANT-ID": merchantTransactionId,
        "X-VERIFY": xVerify,
      },
    };
    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
        res.send(response.data);
        if (response.data.code === "PAYMENT_SUCCESS") {
          //Redirect to success page
        } else if (response.data.code === "PAYMENT_ERROR") {
          //Redirect to Error Page
        } else {
          //redirect tot pending page
        }
      })
      .catch(function (error) {
        console.error(error);
      });
    // res.send({ merchantTrasactionId });
  } else {
    res.send({ error: "Error" });
  }
});

app.listen(port, () => {
  console.log(`App Start listening on port ${port}`);
});
