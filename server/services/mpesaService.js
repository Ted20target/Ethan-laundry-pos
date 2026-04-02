const { getBaseUrl, getPassword, getTimestamp } = require("../config/mpesa");

function normalizePhoneNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 9) {
    return `254${digits}`;
  }

  return digits;
}

function validatePhoneNumber(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!/^2547\d{8}$/.test(normalizedPhone)) {
    throw new Error("Invalid M-Pesa phone number. Use Safaricom format like 2547XXXXXXXX.");
  }

  return normalizedPhone;
}

function validateCallbackUrl(callbackUrl) {
  if (!callbackUrl) {
    throw new Error("Missing M-Pesa callback URL.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch (_error) {
    throw new Error("Invalid M-Pesa callback URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("M-Pesa callback URL must use HTTPS.");
  }

  if (
    parsedUrl.hostname === "mydomain.com" ||
    !parsedUrl.pathname.includes("/api/payments/mpesa/callback")
  ) {
    throw new Error("Set MPESA_CALLBACK_URL to your public HTTPS /api/payments/mpesa/callback endpoint.");
  }

  return parsedUrl.toString();
}

async function parseMpesaResponse(response) {
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  try {
    return {
      contentType,
      body: rawText ? JSON.parse(rawText) : {},
      raw: rawText
    };
  } catch (_error) {
    return {
      contentType,
      body: {},
      raw: rawText
    };
  }
}

function looksLikeHtmlDocument(rawText = "") {
  return /^\s*</.test(rawText) && /<html|<body|<meta/i.test(rawText);
}

function buildMpesaErrorMessage(parsedResponse, fallbackMessage) {
  const { body, raw, contentType } = parsedResponse;

  if (body?.errorMessage) {
    return body.errorMessage;
  }

  if (body?.ResponseDescription) {
    return body.ResponseDescription;
  }

  if (body?.error_description) {
    return body.error_description;
  }

  if (/incapsula/i.test(raw) || /_Incapsula_Resource/i.test(raw)) {
    return "M-Pesa request was blocked by Safaricom security (Incapsula). Confirm you are using the correct Daraja environment, a valid public HTTPS callback URL, and that your server/IP is allowed to reach the API.";
  }

  if (contentType.includes("text/html") || looksLikeHtmlDocument(raw)) {
    return "M-Pesa returned an HTML page instead of JSON. This usually means the request was blocked upstream or the endpoint/environment configuration is incorrect.";
  }

  return fallbackMessage;
}

async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing M-Pesa consumer key or consumer secret.");
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  let response;
  try {
    response = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });
  } catch (error) {
    throw new Error(`Failed to reach M-Pesa access token endpoint: ${error.message}`);
  }

  const parsedResponse = await parseMpesaResponse(response);
  if (!response.ok) {
    throw new Error(buildMpesaErrorMessage(parsedResponse, "Failed to get M-Pesa access token."));
  }

  return parsedResponse.body.access_token;
}

async function initiateStkPush({ amount, phoneNumber, reference, description }) {
  const businessShortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const transactionType = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";

  if (!businessShortCode || !passkey || !callbackUrl) {
    throw new Error("Missing M-Pesa shortcode, passkey, or callback URL.");
  }

  const timestamp = getTimestamp();
  const password = getPassword(businessShortCode, passkey, timestamp);
  const token = await getAccessToken();
  const validatedPhoneNumber = validatePhoneNumber(phoneNumber);
  const payload = {
    BusinessShortCode: businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: transactionType,
    Amount: Number(amount),
    PartyA: validatedPhoneNumber,
    PartyB: businessShortCode,
    PhoneNumber: validatedPhoneNumber,
    CallBackURL: validateCallbackUrl(callbackUrl),
    AccountReference: reference,
    TransactionDesc: description
  };

  let response;
  try {
    response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error(`Failed to reach M-Pesa STK endpoint: ${error.message}`);
  }

  const parsedResponse = await parseMpesaResponse(response);
  if (!response.ok) {
    throw new Error(buildMpesaErrorMessage(parsedResponse, "STK Push request failed."));
  }

  return parsedResponse.body;
}

async function queryStkPush({ checkoutRequestId }) {
  const businessShortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!businessShortCode || !passkey) {
    throw new Error("Missing M-Pesa shortcode or passkey.");
  }

  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(businessShortCode, passkey, timestamp);

  let response;
  try {
    response = await fetch(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    });
  } catch (error) {
    throw new Error(`Failed to reach M-Pesa query endpoint: ${error.message}`);
  }

  const parsedResponse = await parseMpesaResponse(response);
  if (!response.ok) {
    throw new Error(buildMpesaErrorMessage(parsedResponse, "Failed to query STK status."));
  }

  return parsedResponse.body;
}

module.exports = {
  initiateStkPush,
  normalizePhoneNumber,
  queryStkPush,
  validateCallbackUrl,
  validatePhoneNumber
};
