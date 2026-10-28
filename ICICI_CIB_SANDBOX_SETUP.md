# ICICI CIB sandbox configuration

## Temporary queue API skip

For the current temporary workflow, `.env.local` sets:

```dotenv
ICICI_CIB_SKIP_QUEUE_API=true
```

Both Advance and Balance Payments still require Approved status, Approve permission, and an unused queue. Advance also retains its Purchase/Advance MEMO requirement. The final payable amount must be positive. Queue generation saves the queue locally and displays **Generated**; it sends no bank request, creates no bank reference, and does not mark the payment Paid. No extra UI action is required.

To resume the preserved ICICI submission code, change this switch to `false`, configure `ICICI_CIB_ENABLED=true` and the credentials below, then restart/redeploy the server. Missing or invalid bank configuration then produces the existing API error; there is no automatic fallback. Queues generated during the skip period are not automatically submitted afterward. Existing ICICI submissions, including uncertain ones, cannot be converted into locally generated queues.

## ICICI configuration

The integration is server-side and sandbox-only. Do not add credentials, private keys, or certificates to source control or client-side environment variables.

Set these values in the backend deployment environment (or local `.env.local` for local development):

```dotenv
ICICI_CIB_ENABLED=true
ICICI_CIB_TRANSACTION_URL=https://apibankingonesandbox.icicibank.com/api/Corporate/CIB_SV/v1/Transaction
ICICI_CIB_INQUIRY_URL=https://apibankingonesandbox.icicibank.com/api/Corporate/CIB_SV/v1/TransactionInquiry
ICICI_CIB_NEFT_STATUS_URL=https://apibankingonesandbox.icicibank.com/api/v1/CIBNEFTStatus_SV
ICICI_CIB_AGGRID=
ICICI_CIB_AGGRNAME=
ICICI_CIB_CORPID=
ICICI_CIB_USERID=
ICICI_CIB_URN=
ICICI_CIB_DEBIT_ACCOUNT=
ICICI_CIB_TXNTYPE=RGS
ICICI_CIB_SERVICE_NAME=
ICICI_CIB_OAEP_HASH=SHA1
ICICI_CIB_BANK_CERTIFICATE_PEM=
ICICI_CIB_CLIENT_PRIVATE_KEY_PEM=
ICICI_CIB_CLIENT_PRIVATE_KEY_PASSPHRASE=
ICICI_CIB_EXTRA_HEADERS_JSON={}
ICICI_CIB_TIMEOUT_MS=20000
```

The PEM values may be supplied as multiline values or with `\n` line breaks. The client private key must match the public certificate registered with ICICI. If encrypted, configure its passphrase as a server-side secret. Only server-side variables are supported.

Before enabling this integration, ICICI must confirm the correct CIB UAT or Service Virtualization endpoint, service name, encryption variant/hash, required request headers, transaction type, credentials, certificates, and IP allowlisting for Jaya Logistics. The endpoint guard rejects any host other than ICICI's documented sandbox host. `ICICI_CIB_TXNTYPE` must match the payment mode approved for the test account; `RGS` is the documented NEFT code, while `RTG`, `IFS`, and `TPA` are also supported by the guide. ICICI intra-bank transfers use `TPA` and `ICIC0000011`.

For the documented Service Virtualization setup, the supplied ICICI guide lists sample CIB identifiers and test beneficiary accounts. Use those only when ICICI confirms they apply to the endpoint and encryption configuration being tested.

The queue action always submits with `WORKFLOW_REQD: "Y"`. It does not approve a payment in CIB. If the bank response is missing or ambiguous, the ERP records the transaction as uncertain and requires a status inquiry before another submission. Submitted payments cannot be edited, deleted, or approved in the ERP.

For NEFT (`RGS`), an accepted transaction response or transaction inquiry `SUCCESS` does not by itself mark the ERP payment completed. The ERP waits for the NEFT incremental-status response confirming beneficiary credit; pending RBI/processing states remain queued. Confirm the endpoint's exact response fields and terminal status wording with ICICI during UAT.
