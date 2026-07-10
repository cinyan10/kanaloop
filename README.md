# KanaLoop

KanaLoop is a static kana drill app for hiragana and katakana. It stores review progress locally in the browser and uses Japanese browser text-to-speech for revealed answers.

## Development

```bash
npm install
npm run dev
```

## Tests and Build

```bash
npm run test
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Runtime: static assets only, no server functions required

## Audio

Basic kana MP3 samples in `public/sounds/` are from [`digitaIfabric/japanese`](https://github.com/digitaIfabric/japanese). That repository does not currently publish an explicit license file.
