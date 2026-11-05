# Fixture parser user guide

Open index.html in a browser; no install or server is required.

## Walkthrough
1. Enter the synthetic input `TASK: inspect pump` in Message.
2. Select Parse message.
3. The result is `inspect pump`.

## Data and limitations
The fixture strips the TASK prefix; empty input asks you to enter a message. A successful result is retained after reload in browser storage. No export or reset control is provided.

## Troubleshooting
If no result appears, select Parse message and check that browser scripts are enabled.

## Developer tests
With Node installed, run `node --test parser.test.cjs`. See [verification notes](verification.md) and [field validation](path-to-fleet.md). This is a synthetic integration-test fixture.
