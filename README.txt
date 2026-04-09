IT'Z YA BOIZE - Git Ready Netlify Scheduler

This package is the clean Git-ready version of your Netlify-only scheduler.

Included:
- your menu site files
- Netlify Functions for slot lookup and booking
- package.json for dependencies
- netlify.toml for function configuration
- DEPLOY-STEPS.txt with exact next steps

Recommended use:
Upload this folder to a GitHub repo, then connect that repo to Netlify.

Do not use simple drag-and-drop deploy for this version.


Patch applied:
- Fixed Netlify Blobs initialization for Lambda-compatible Functions by calling connectLambda(event)
- This resolves MissingBlobsEnvironmentError for deployed functions that use exports.handler format


Patch v2 applied:
- Replaced unsupported store.getJSON(...) calls with store.get(key, { type: "json" })
- This resolves the runtime error: "store.getJSON is not a function"
