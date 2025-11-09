# omaha

A Google product update checker with HTML interface.

Current checking products: Chrome (Stable, Beta, Dev, Canary), Google Play Games Beta, Quick Share, Google Play Games Developer Emulator (Stable, Beta)

## Usage

1. Open `index.html` in a web browser, or
2. Run the local server:
   ```bash
   npm start
   ```
   Then open http://localhost:8080 in your browser

## Features

- Click "Fetch Updates" button to check for the latest versions
- Results displayed in a table with download links
- Data cached for 5 minutes in browser localStorage
- Show/hide POST response (beautified JSON)
- Last update timestamp shown when cache is valid

## Notes

nodejs 20.18.3 or later recommended

## Reference

[chromium/src/+/main:docs/updater/protocol_3_1.md](https://source.chromium.org/chromium/chromium/src/+/main:docs/updater/protocol_3_1.md)

[omaha/blob/main/doc/ServerProtocolV3.md](https://github.com/google/omaha/blob/main/doc/ServerProtocolV3.md)
